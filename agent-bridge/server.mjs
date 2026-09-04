#!/usr/bin/env node
/**
 * DeckForge Agent Bridge
 *
 * 零依赖的本地 HTTP 桥接服务：把浏览器里发出的自然语言指令转发给本机已安装的
 * Codex CLI（codex exec），并把返回结果解析成可替换的幻灯片 HTML。
 *
 * 用法：node agent-bridge/server.mjs   （或 npm run agent）
 * 环境变量：
 *   PORT               监听端口，默认 8787
 *   CODEX_BIN          codex 可执行文件，默认 "codex"
 *   AGENT_TIMEOUT_MS   单次任务超时，默认 600000（10 分钟）
 *
 * 仅监听 127.0.0.1，不会暴露到局域网。
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const HOST = '127.0.0.1';
const CODEX_BIN = process.env.CODEX_BIN || 'codex';
const AGENT_TIMEOUT_MS = Number(process.env.AGENT_TIMEOUT_MS || 600000);
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const state = { running: 0 };

const SERVER = { startedAt: new Date().toISOString() };

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function codexVersion() {
  return new Promise((resolve) => {
    const child = spawn(CODEX_BIN, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', () => resolve(null));
    child.on('close', (code) => resolve(code === 0 ? out.trim() : null));
  });
}

function buildPrompt({ instruction, slideHtml, context }) {
  const width = context?.width || 1920;
  const height = context?.height || 1080;
  return `你是一个专业的 HTML 演示文稿页面编辑助手。用户会给你一页幻灯片容器的内部 HTML，以及一条编辑指令。

硬性要求：
1. 只修改这一页，返回修改后这一页容器的完整内部 HTML。外层容器（负责页面定位与激活状态类）由系统负责，你不要输出它。
2. 保持原有技术栈与排版体系：保留已有的 class 命名、内联 style、结构风格；不要引入外部 CSS/JS/字体/CDN 链接；所有 <img> 的 src 原样保留，不要改写、不要内联、不要删除。
3. 幻灯片画布约为 ${width} x ${height} 像素，调整布局时内容不要超出画布。
4. 输出的 HTML 必须是合法的、可以直接设置 innerHTML 的片段。

输出格式（严格遵守）：除了简短说明外，最终回复的末尾必须用下面的哨兵标记包裹唯一的 html 代码块：

<!--DECKFORGE:BEGIN-->
\`\`\`html
（完整替换后的幻灯片内部 HTML）
\`\`\`
<!--DECKFORGE:END-->

## 编辑指令
${instruction}

## 页面信息
${context?.pageLabel ? `- 页面：${context.pageLabel}` : ''}
${context?.pageTitle ? `- 页面标题：${context.pageTitle}` : ''}

## 当前幻灯片内部 HTML
\`\`\`html
${slideHtml}
\`\`\`
`;
}

function extractHtml(text) {
  const begin = text.indexOf('<!--DECKFORGE:BEGIN-->');
  const end = text.indexOf('<!--DECKFORGE:END-->');
  let body = null;
  if (begin !== -1 && end !== -1 && end > begin) {
    body = text.slice(begin + '<!--DECKFORGE:BEGIN-->'.length, end);
  }
  if (body === null) {
    const fences = [...text.matchAll(/```html\s*([\s\S]*?)```/gi)];
    if (fences.length > 0) body = fences[fences.length - 1][1];
  }
  if (body === null) {
    const trimmed = text.trim();
    if (/^</.test(trimmed)) body = trimmed;
  }
  if (body === null) {
    throw new Error('Codex 返回中没有找到幻灯片 HTML（缺少哨兵标记或 html 代码块）');
  }
  // 兜底：Codex 可能在哨兵内又包一层 ``` 围栏，若整体被围栏包住则剥掉
  const fenced = body.match(/^\s*```(?:html)?\s*([\s\S]*?)\s*```\s*$/i);
  if (fenced) body = fenced[1];
  const html = body.trim();
  if (!html) throw new Error('Codex 返回了空的幻灯片 HTML');
  return html;
}

function runCodex(prompt, abortSignal) {
  return new Promise((resolve, reject) => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deckforge-agent-'));
    const args = [
      'exec',
      '--sandbox', 'read-only',
      '--skip-git-repo-check',
      '-C', workDir,
    ];
    if (process.env.CODEX_MODEL) args.push('--model', process.env.CODEX_MODEL);

    const child = spawn(CODEX_BIN, args, {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer = null;

    const onAbort = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      child.kill('SIGKILL');
      reject(new Error('任务已取消'));
    };
    if (abortSignal) {
      if (abortSignal.aborted) { onAbort(); return; }
      abortSignal.addEventListener('abort', onAbort, { once: true });
    }

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`Codex 执行超时（${Math.round(AGENT_TIMEOUT_MS / 1000)} 秒）`));
    }, AGENT_TIMEOUT_MS);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.stdin.on('error', () => {});
    child.stdin.end(prompt);

    const cleanupSignal = () => { if (abortSignal) abortSignal.removeEventListener('abort', onAbort); };

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanupSignal();
      reject(new Error(err.code === 'ENOENT'
        ? `找不到 ${CODEX_BIN} 命令，请确认已安装 Codex CLI 并在 PATH 中`
        : `无法启动 Codex：${err.message}`));
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanupSignal();
      if (code === 0) {
        resolve(stdout);
      } else {
        const detail = stderr.trim().split('\n').slice(-3).join(' ');
        reject(new Error(`Codex 退出码 ${code}${detail ? `：${detail}` : ''}`));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const version = await codexVersion();
    sendJson(res, 200, { ok: true, service: 'deckforge-agent-bridge', codex: version, uptime: SERVER.startedAt });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/agent/run') {
    if (state.running > 0) {
      sendJson(res, 409, { ok: false, error: '已有一个 Agent 任务在运行，请等待其完成' });
      return;
    }
    let aborted = false;
    // 注意：Node 16+ 中 req 的 'close' 在请求体读完时就会触发，
    // 不能用来判断客户端断开；改用 res 的 'close' + writableEnded 判断。
    res.on('close', () => { if (!res.writableEnded) aborted = true; });
    const abortController = new AbortController();
    res.on('close', () => { if (!res.writableEnded) abortController.abort(); });
    try {
      const body = await readBody(req);
      const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
      const slideHtml = typeof body.slideHtml === 'string' ? body.slideHtml : '';
      if (!instruction) throw new Error('缺少编辑指令');
      if (!slideHtml.trim()) throw new Error('缺少幻灯片内容');

      state.running += 1;
      console.log(`[agent] 收到指令（${slideHtml.length} 字符）：${instruction.slice(0, 80)}`);
      const raw = await runCodex(buildPrompt({ instruction, slideHtml, context: body.context }), abortController.signal);
      if (aborted) {
        sendJson(res, 499, { ok: false, error: '客户端已取消' });
        return;
      }
      const html = extractHtml(raw);
      console.log(`[agent] 完成，返回 ${html.length} 字符`);
      sendJson(res, 200, { ok: true, html });
    } catch (err) {
      console.error('[agent] 失败：', err.message);
      sendJson(res, 502, { ok: false, error: err instanceof Error ? err.message : '未知错误' });
    } finally {
      state.running -= 1;
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not Found' });
});

server.listen(PORT, HOST, () => {
  console.log(`DeckForge Agent Bridge: http://${HOST}:${PORT}`);
  console.log(`codex 命令: ${CODEX_BIN}，超时: ${Math.round(AGENT_TIMEOUT_MS / 1000)}s`);
});

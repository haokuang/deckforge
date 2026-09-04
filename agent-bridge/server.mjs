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

const state = {
  running: 0,
  events: [],            // 最近一次任务的过程事件（SSE 快照用）
  taskActive: false,
  sseClients: new Set(), // 正在订阅 /api/agent/events 的响应流
};

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

function clip(str, max = 4000) {
  const s = String(str ?? '');
  return s.length > max ? s.slice(0, max) + `\n…（已截断，共 ${s.length} 字符）` : s;
}

// 展示用：最终回复里的哨兵块对用户没有意义，替换成一句提示
function prettyAgentText(text) {
  return String(text || '')
    .replace(/<!--DECKFORGE:BEGIN-->[\s\S]*?<!--DECKFORGE:END-->/g, '\n〔已提取替换用 HTML〕\n')
    .trim();
}

// 把 codex exec --json 的 JSONL 事件压缩成前端好渲染的显示事件；
// 只挑有信息量的，item.started 等噪音直接丢弃。
function normalizeCodexEvent(evt) {
  if (evt.type === 'turn.started') return { kind: 'status', text: '开始执行' };
  if (evt.type === 'turn.completed') {
    const u = evt.usage || {};
    return { kind: 'done', usage: { input: u.input_tokens, output: u.output_tokens } };
  }
  if (evt.type === 'error') return { kind: 'error', text: clip(evt.message || '未知错误', 1000) };
  if (evt.type !== 'item.completed' || !evt.item) return null;
  const item = evt.item;
  switch (item.type) {
    case 'agent_message':
      return { kind: 'message', text: clip(prettyAgentText(item.text), 8000) };
    case 'reasoning': {
      const text = String(item.text || '').trim();
      return text ? { kind: 'reasoning', text: clip(text, 2000) } : null;
    }
    case 'command_execution':
      return {
        kind: 'command',
        command: String(item.command || ''),
        exitCode: typeof item.exit_code === 'number' ? item.exit_code : null,
        output: clip(item.aggregated_output || ''),
      };
    case 'file_change': {
      const changes = Array.isArray(item.changes) ? item.changes : [];
      const text = changes.map((c) => `${c.kind || '修改'} ${c.path || ''}`).join('\n').trim();
      return text ? { kind: 'file_change', text } : null;
    }
    case 'mcp_tool_call':
      return { kind: 'tool', text: clip(item.tool || item.server || 'MCP 调用', 500) };
    case 'web_search':
      return { kind: 'tool', text: clip(item.query || '网页搜索', 500) };
    case 'error':
      // codex 会把环境警告（如 code-mode 缺失）也作为 error item 发出，但任务仍可成功
      return { kind: 'notice', text: clip(item.message || '', 1000) };
    default:
      return null;
  }
}

function broadcastEvent(evt) {
  const payload = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of state.sseClients) {
    try {
      res.write(payload);
    } catch {
      state.sseClients.delete(res);
    }
  }
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

function runCodex(prompt, abortSignal, onEvent) {
  return new Promise((resolve, reject) => {
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deckforge-agent-'));
    const args = [
      'exec',
      '--json',
      '--sandbox', 'read-only',
      '--skip-git-repo-check',
      '-C', workDir,
    ];
    if (process.env.CODEX_MODEL) args.push('--model', process.env.CODEX_MODEL);

    const child = spawn(CODEX_BIN, args, {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let lineBuf = '';
    let plainStdout = '';
    const messageTexts = []; // agent_message 文本，用于重建最终回复
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

    child.stdout.on('data', (d) => {
      lineBuf += d.toString('utf8');
      let idx;
      while ((idx = lineBuf.indexOf('\n')) !== -1) {
        const line = lineBuf.slice(0, idx).trim();
        lineBuf = lineBuf.slice(idx + 1);
        if (!line) continue;
        let evt = null;
        try { evt = JSON.parse(line); } catch { evt = null; }
        if (!evt || typeof evt !== 'object') {
          // 不是 JSONL（旧版 CLI 不支持 --json 时），原样保留用于兜底提取
          plainStdout += `${line}\n`;
          continue;
        }
        if (evt.type === 'item.completed' && evt.item?.type === 'agent_message' && typeof evt.item.text === 'string') {
          messageTexts.push(evt.item.text);
        }
        const normalized = normalizeCodexEvent(evt);
        if (normalized && typeof onEvent === 'function') onEvent(normalized);
      }
    });
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
        // --json 模式下 stdout 是事件流，最终回复要从 agent_message 重建；
        // 没有消息时退回原始文本行（旧版 CLI 兜底）
        resolve(messageTexts.length > 0 ? messageTexts.join('\n\n') : plainStdout + lineBuf);
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

  if (req.method === 'GET' && url.pathname === '/api/agent/events') {
    // SSE：连接即回放当前/最近一次任务的全部事件，之后实时推送
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    res.write(`data: ${JSON.stringify({ kind: 'snapshot', active: state.taskActive, events: state.events })}\n\n`);
    state.sseClients.add(res);
    req.on('close', () => { state.sseClients.delete(res); });
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
      state.events = [];
      state.taskActive = true;
      const emit = (evt) => { state.events.push(evt); broadcastEvent(evt); };
      emit({ kind: 'task_start', instruction: clip(instruction, 300) });
      console.log(`[agent] 收到指令（${slideHtml.length} 字符）：${instruction.slice(0, 80)}`);
      const raw = await runCodex(buildPrompt({ instruction, slideHtml, context: body.context }), abortController.signal, emit);
      if (aborted) {
        sendJson(res, 499, { ok: false, error: '客户端已取消' });
        return;
      }
      const html = extractHtml(raw);
      console.log(`[agent] 完成，返回 ${html.length} 字符，过程事件 ${state.events.length} 条`);
      sendJson(res, 200, { ok: true, html, events: state.events });
    } catch (err) {
      console.error('[agent] 失败：', err.message);
      sendJson(res, 502, { ok: false, error: err instanceof Error ? err.message : '未知错误' });
    } finally {
      state.running -= 1;
      state.taskActive = false;
      broadcastEvent({ kind: 'task_end' });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not Found' });
});

server.listen(PORT, HOST, () => {
  console.log(`DeckForge Agent Bridge: http://${HOST}:${PORT}`);
  console.log(`codex 命令: ${CODEX_BIN}，超时: ${Math.round(AGENT_TIMEOUT_MS / 1000)}s`);
});

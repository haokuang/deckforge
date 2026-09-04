# DeckForge Agent Bridge

本地桥接服务：让浏览器里的 DeckForge 通过自然语言指令调用本机 **Codex CLI**，直接修改当前打开的幻灯片页面。零 npm 依赖，纯 Node 内置模块实现。

## 工作原理

```
DeckForge 浏览器端                     本机
┌─────────────────────┐   HTTP    ┌──────────────┐   spawn    ┌────────────┐
│ AI 面板输入指令        │ ───────▶ │ server.mjs   │ ─────────▶ │ codex exec │
│ 锁定当前页            │          │ 127.0.0.1    │            │ (只读沙箱)  │
│ 导出该页 HTML 快照    │ ◀─────── │ 解析哨兵标记   │ ◀───────── │ 返回 HTML   │
│ 替换该页 innerHTML    │          └──────────────┘            └────────────┘
│ 解锁（可一键撤销）     │
└─────────────────────┘
```

## 冲突防护：页级锁定

Agent 编辑与人工编辑可能同时发生，DeckForge 用**单写者 + 页级锁**解决：

1. **锁定**：任务开始时，目标页进入锁定状态——预览区显示「AI Agent 正在编辑此页」遮罩，页内点击/双击/拖拽/右键/键盘编辑事件全部被桥接脚本拦截。
2. **快照**：锁定后立即导出该页 innerHTML 作为基线，保证发给 Codex 的内容在任务期间不被人工改动。
3. **执行**：Codex 在只读沙箱中运行，无法触碰本机文件；只返回替换后的页面 HTML。
4. **应用**：返回结果整页替换 innerHTML，并记入撤销历史；面板提供「撤销本次 AI 修改」一键回滚。
5. **解锁**：任务完成/失败/取消后立即解锁。其他页面全程不受影响，可正常人工编辑。

同一时刻只允许一个 Agent 任务（桥接服务返回 409 拒绝并发），取消任务会中止 HTTP 请求并杀掉 codex 进程。

## 使用

```bash
# 终端 1：启动桥接服务
npm run agent

# 终端 2：启动 DeckForge
npm run dev
```

在 DeckForge 中打开一个 PPT，切到右侧「AI」面板：

1. 确认桥接服务地址（默认 `http://127.0.0.1:8787`），点「测试」。
2. 输入指令（如「把标题改成 2026 产品规划，正文精简到 3 条」），点「让 AI 修改本页」。
3. 等待完成；不满意可点「撤销本次 AI 修改」或 Ctrl+Z。

## 配置

环境变量：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `8787` | 监听端口 |
| `CODEX_BIN` | `codex` | Codex CLI 可执行文件路径 |
| `CODEX_MODEL` | Codex 默认 | 指定模型，如 `gpt-5.1-codex` |
| `AGENT_TIMEOUT_MS` | `600000` | 单任务超时（毫秒） |

服务只监听 `127.0.0.1`，不暴露到局域网；Codex 以 `--sandbox read-only` 运行。

## HTTP API

- `GET /api/health` — 健康检查，返回 `{ ok, codex }`（codex 为版本号或 null）。
- `POST /api/agent/run` — body: `{ instruction, slideHtml, context? }`，返回 `{ ok, html, events }` 或 `{ ok: false, error }`。`events` 为本次任务的过程事件（Codex 回复、工具调用、耗时等）。
- `GET /api/agent/events` — SSE 事件流。连接即回放当前/最近一次任务的全部事件，之后实时推送；编辑器的「Codex 工作日志」面板即订阅此接口。

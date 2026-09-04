import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, Square, Undo2, PlugZap, CircleAlert, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';

const QUICK_PROMPTS = [
  '优化本页排版，让层次更清晰',
  '润色本页文案，更精炼有力',
  '检查并修正错别字',
  '把本页文字要点化，用列表呈现',
];

function formatElapsed(startedAt: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
}

export function AiToolPanel() {
  const {
    agentSettings, agentTask, lastAgentEdit, currentPageIndex, pages,
    setAgentSettings, testAgentConnection, runAgentOnSlide, cancelAgentTask,
    dismissAgentTaskError, revertLastAgentEdit,
  } = useStore();
  const [instruction, setInstruction] = useState('');
  const [serverUrl, setServerUrl] = useState(agentSettings.serverUrl);
  const [testing, setTesting] = useState(false);
  const [connResult, setConnResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [, forceTick] = useState(0);
  const tickRef = useRef<number | null>(null);

  const running = agentTask.status === 'running';
  const lockedOtherPage = running && agentTask.pageIndex !== currentPageIndex;

  // 运行中每秒刷新一次计时
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => forceTick((v) => v + 1), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  useEffect(() => {
    setServerUrl(agentSettings.serverUrl);
  }, [agentSettings.serverUrl]);

  const handleTest = async () => {
    setTesting(true);
    setConnResult(null);
    try {
      setAgentSettings({ serverUrl });
      const message = await testAgentConnection();
      setConnResult({ ok: true, text: message });
    } catch (err) {
      setConnResult({ ok: false, text: err instanceof Error ? err.message : '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleRun = () => {
    dismissAgentTaskError();
    void runAgentOnSlide(instruction);
  };

  const page = pages[currentPageIndex];

  return (
    <div className="space-y-4">
      {/* 目标页 */}
      <div className="px-3 py-2 rounded-xl bg-deck-fill border border-deck-border flex items-center gap-2">
        <Bot className="w-4 h-4 text-deck-accent shrink-0" />
        <span className="text-[11px] text-deck-text2 truncate">
          {running && !lockedOtherPage
            ? `Agent 正在编辑第 ${agentTask.pageIndex + 1} 页`
            : lockedOtherPage
              ? `Agent 正在编辑第 ${agentTask.pageIndex + 1} 页（当前页不受影响）`
              : `将修改第 ${currentPageIndex + 1} 页${page?.title ? ` · ${page.title}` : ''}`}
        </span>
      </div>

      {/* 桥接服务 */}
      <div className="space-y-2">
        <label className="deck-label block">Codex 桥接服务</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://127.0.0.1:8787"
            className="deck-input flex-1 font-mono text-[11px]"
            disabled={running}
          />
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing || running}
            className="deck-btn-glass px-3 flex items-center gap-1 text-[11px] shrink-0 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlugZap className="w-3 h-3" />}
            <span>测试</span>
          </button>
        </div>
        {connResult && (
          <p className={`text-[10px] flex items-center gap-1 ${connResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {connResult.ok ? <CheckCircle2 className="w-3 h-3" /> : <CircleAlert className="w-3 h-3" />}
            {connResult.text}
          </p>
        )}
        {!connResult && (
          <p className="text-[10px] text-deck-text3 leading-relaxed">
            先在本机运行 <code className="px-1 rounded bg-deck-fill font-mono">npm run agent</code> 启动桥接服务，Agent 通过它调用本机 Codex CLI 修改当前页。
          </p>
        )}
      </div>

      {/* 快捷指令 */}
      {!running && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInstruction(prompt)}
              className="px-2 py-1 rounded-lg text-[10px] bg-deck-fill border border-deck-border text-deck-text3 hover:text-deck-text hover:border-deck-accent/40 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* 指令输入 */}
      {!running && (
        <>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="用一句话告诉 AI 怎么改这一页，例如：把标题改成「2026 产品规划」，正文要点精简到 3 条"
            className="deck-input w-full h-24 resize-none text-[12px]"
          />
          <button
            type="button"
            onClick={handleRun}
            disabled={!instruction.trim()}
            className="deck-btn w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>让 AI 修改本页</span>
          </button>
        </>
      )}

      {/* 运行中 */}
      {running && (
        <div className="deck-glass-thin p-4 rounded-xl space-y-3 border border-deck-accent/30">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 text-deck-accent animate-spin" />
            <span className="text-[12px] text-deck-text">Codex 正在修改该页… {formatElapsed(agentTask.startedAt)}</span>
          </div>
          <p className="text-[10px] text-deck-text3 leading-relaxed">该页已临时锁定，人工编辑会等待任务结束；其他页面不受影响，可继续操作。</p>
          <button
            type="button"
            onClick={cancelAgentTask}
            className="deck-btn-ghost w-full flex items-center justify-center gap-1.5 py-2 text-[12px]"
          >
            <Square className="w-3 h-3" />
            <span>取消任务</span>
          </button>
        </div>
      )}

      {/* 错误 */}
      {!running && agentTask.error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
          <p className="text-[11px] text-red-300 leading-relaxed break-all">{agentTask.error}</p>
          <button
            type="button"
            onClick={dismissAgentTaskError}
            className="text-[10px] text-deck-text3 hover:text-deck-text underline"
          >
            知道了
          </button>
        </div>
      )}

      {/* 上次修改 */}
      {!running && lastAgentEdit && (
        <div className="deck-glass-thin p-3.5 rounded-xl space-y-2">
          <p className="text-[11px] text-deck-text2 leading-relaxed">
            上次 AI 修改：第 {lastAgentEdit.pageIndex + 1} 页 · {lastAgentEdit.instruction}
          </p>
          <button
            type="button"
            onClick={revertLastAgentEdit}
            className="deck-btn-glass w-full flex items-center justify-center gap-1.5 py-2 text-[12px]"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>撤销本次 AI 修改</span>
          </button>
        </div>
      )}
    </div>
  );
}

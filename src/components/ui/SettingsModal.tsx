import { useState, useEffect, useRef } from 'react';
import { X, Save, Bot, PlugZap, Loader2, Settings } from 'lucide-react';
import { useStore } from '../../store';
import { IconButton } from './IconButton';

export function SettingsModal() {
  const { showSettings, setShowSettings, agentSettings, setAgentSettings } = useStore();
  const [agentUrl, setAgentUrl] = useState(agentSettings.serverUrl);
  const [testing, setTesting] = useState(false);
  const [connResult, setConnResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSettings) {
      setAgentUrl(agentSettings.serverUrl);
      setConnResult(null);
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [showSettings, agentSettings.serverUrl]);

  // 焦点陷阱
  useEffect(() => {
    if (!showSettings) return;
    const modal = modalRef.current;
    if (!modal) return;

    const firstFocusable = modal.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSettings(false);
      }
      if (e.key === 'Tab') {
        const focusable = Array.from(modal.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, setShowSettings]);

  if (!showSettings) return null;

  const handleSave = () => {
    setAgentSettings({ serverUrl: agentUrl.trim() || 'http://127.0.0.1:8787' });
    setShowSettings(false);
  };

  const handleTestAgent = async () => {
    setTesting(true);
    setConnResult(null);
    try {
      setAgentSettings({ serverUrl: agentUrl.trim() || 'http://127.0.0.1:8787' });
      const message = await useStore.getState().testAgentConnection();
      setConnResult({ ok: true, text: message });
    } catch (err) {
      setConnResult({ ok: false, text: err instanceof Error ? err.message : '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-deck-overlay backdrop-blur-xl transition-opacity duration-300" onClick={() => setShowSettings(false)} />

      <div
        ref={modalRef}
        className={`relative w-full max-w-lg mx-4 transition-all duration-300 ${visible ? 'scale-100 translate-y-0 opacity-100' : 'scale-[0.96] translate-y-3 opacity-0'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-deck-accent/50 to-transparent" />

        <div className="deck-glass-thick p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-deck-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-deck-accent/20 to-deck-accent/5 flex items-center justify-center border border-deck-accent/15">
                <Settings className="w-[18px] h-[18px] text-deck-accent" />
              </div>
              <div>
                <h2 id="settings-title" className="text-[15px] font-semibold text-deck-text tracking-tight">设置</h2>
                <p className="text-[11px] text-deck-text3 mt-0.5">配置本地 Codex Agent 桥接</p>
              </div>
            </div>
            <IconButton icon={X} title="关闭" onClick={() => setShowSettings(false)} />
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto deck-scroll">
            <div className="deck-glass-thin p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Bot className="w-3.5 h-3.5 text-deck-accent" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-deck-text3">Codex Agent 桥接</span>
              </div>
              <div>
                <label className="deck-label mb-2.5 block">桥接服务地址</label>
                <input
                  type="text"
                  value={agentUrl}
                  onChange={(e) => setAgentUrl(e.target.value)}
                  placeholder="http://127.0.0.1:8787"
                  className="deck-input w-full font-mono text-[12px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleTestAgent()}
                  disabled={testing}
                  className="deck-btn-glass px-4 py-1.5 text-[12px] flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
                  <span>测试连接</span>
                </button>
                {connResult && (
                  <span className={`text-[11px] ${connResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>{connResult.text}</span>
                )}
              </div>
              <p className="text-[11px] text-deck-text3 leading-relaxed">在本机运行 <code className="px-1 rounded bg-deck-fill font-mono">npm run agent</code> 启动桥接服务后，AI 面板即可让本机 Codex 直接修改当前页。Agent 编辑期间对应页面会临时锁定。</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-deck-border">
            <button
              onClick={() => setShowSettings(false)}
              className="deck-btn-ghost px-5 py-2.5 text-[13px]"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="deck-btn flex items-center gap-2 px-5 py-2.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="text-[13px]">保存设置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

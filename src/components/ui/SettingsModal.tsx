import { useState, useEffect, useRef } from 'react';
import { X, Save, Key, Bot, ChevronDown, Sparkles, Shield, Server, Settings, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../../store';
import { AI_PROVIDERS } from '../../utils/constants';
import { Switch } from './Switch';
import { IconButton } from './IconButton';

export function SettingsModal() {
  const { showSettings, setShowSettings, aiSettings, setAISettings } = useStore();
  const [localSettings, setLocalSettings] = useState(aiSettings);
  const [visible, setVisible] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSettings) {
      setLocalSettings(aiSettings);
      setShowKey(false);
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [showSettings, aiSettings]);

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

  const handleSave = () => { setAISettings(localSettings); setShowSettings(false); };
  const provider = AI_PROVIDERS.find((p) => p.value === localSettings.provider);

  const handleProviderChange = (value: string) => {
    const p = AI_PROVIDERS.find((item) => item.value === value);
    setLocalSettings((s) => ({
      ...s,
      provider: value as typeof s.provider,
      apiUrl: p?.value === 'custom' ? s.apiUrl : (p?.defaultUrl || s.apiUrl),
      model: p?.defaultModel || s.model,
    }));
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xl transition-opacity duration-300" onClick={() => setShowSettings(false)} />

      <div
        ref={modalRef}
        className={`relative w-full max-w-lg mx-4 transition-all duration-300 ${visible ? 'scale-100 translate-y-0 opacity-100' : 'scale-[0.96] translate-y-3 opacity-0'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-deck-accent/50 to-transparent" />

        <div className="deck-glass-thick p-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-deck-accent/20 to-deck-accent/5 flex items-center justify-center border border-deck-accent/15">
                <Settings className="w-[18px] h-[18px] text-deck-accent" />
              </div>
              <div>
                <h2 id="settings-title" className="text-[15px] font-semibold text-white tracking-tight">设置</h2>
                <p className="text-[11px] text-white/30 mt-0.5">配置 AI 智能适配与连接参数</p>
              </div>
            </div>
            <IconButton icon={X} title="关闭" onClick={() => setShowSettings(false)} />
          </div>

          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto deck-scroll">
            <div className="deck-glass-thin p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${localSettings.enabled ? 'bg-deck-accent/15 border-deck-accent/20' : 'bg-white/5 border-white/8'} border`}>
                    <Sparkles className={`w-[18px] h-[18px] transition-colors duration-300 ${localSettings.enabled ? 'text-deck-accent' : 'text-white/25'}`} />
                  </div>
                  <div>
                    <span className="text-[13px] font-medium text-white/90 block">启用 AI 智能适配</span>
                    <span className="text-[11px] text-white/30 block mt-0.5">选中元素后可调用 AI 进行智能转换</span>
                  </div>
                </div>
                <Switch
                  checked={localSettings.enabled}
                  onChange={(checked) => setLocalSettings((s) => ({ ...s, enabled: checked }))}
                />
              </div>
            </div>

            <div className={`space-y-3 transition-all duration-300 ${localSettings.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-35 pointer-events-none'}`}>
              <div className="flex items-center gap-2 px-1">
                <Server className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">连接配置</span>
              </div>

              <div className="deck-glass-thin p-4 rounded-2xl space-y-4">
                <div>
                  <label className="deck-label mb-2.5 block">AI 提供商</label>
                  <div className="relative">
                    <select
                      value={localSettings.provider}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      className="deck-input w-full appearance-none cursor-pointer pr-10"
                      disabled={!localSettings.enabled}
                    >
                      {AI_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="deck-label mb-2.5 block">模型</label>
                  <input
                    type="text"
                    value={localSettings.model || provider?.defaultModel || ''}
                    onChange={(e) => setLocalSettings((s) => ({ ...s, model: e.target.value }))}
                    className="deck-input w-full"
                    disabled={!localSettings.enabled}
                    placeholder="例如 gpt-4o"
                  />
                  {provider && provider.value !== 'custom' && (
                    <p className="text-[10px] text-white/20 mt-1.5">默认: {provider.defaultModel}</p>
                  )}
                </div>

                {localSettings.provider === 'custom' && (
                  <div>
                    <label className="deck-label mb-2.5 block">API 地址</label>
                    <input
                      type="text"
                      value={localSettings.apiUrl || ''}
                      onChange={(e) => setLocalSettings((s) => ({ ...s, apiUrl: e.target.value }))}
                      className="deck-input w-full"
                      disabled={!localSettings.enabled}
                      placeholder="https://api.example.com/v1/chat/completions"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className={`space-y-3 transition-all duration-300 ${localSettings.enabled ? 'opacity-100 pointer-events-auto' : 'opacity-35 pointer-events-none'}`}>
              <div className="flex items-center gap-2 px-1">
                <Shield className="w-3.5 h-3.5 text-white/25" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">安全认证</span>
              </div>

              <div className="deck-glass-thin p-4 rounded-2xl">
                <label className="deck-label mb-2.5 block">API Key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={localSettings.apiKey}
                    onChange={(e) => setLocalSettings((s) => ({ ...s, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="deck-input w-full pl-10 pr-10"
                    disabled={!localSettings.enabled}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                    title={showKey ? '隐藏' : '显示'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-start gap-2 mt-3">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-deck-accent2/10 mt-0.5 shrink-0">
                    <Bot className="w-2.5 h-2.5 text-deck-accent2" />
                  </div>
                  <p className="text-[11px] text-white/25 leading-relaxed">API Key 仅存储在本地浏览器中，不会发送到任何第三方服务器。所有 AI 请求直接从您的浏览器发出。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/[0.06]">
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

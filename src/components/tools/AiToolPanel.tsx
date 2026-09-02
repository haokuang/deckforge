import { useState } from 'react';
import { Sparkles, Loader2, Check, X, Copy } from 'lucide-react';
import { useStore } from '../../store';
import { AI_ADAPTER_TEMPLATES } from '../../utils/constants';
import { ChipGroup } from '../ui/ChipGroup';
import { EmptyState } from '../ui/EmptyState';
import { IconButton } from '../ui/IconButton';

export function AiToolPanel() {
  const { selectedElement, aiSettings, applyHtml, addToast } = useStore();
  const [selectedTemplate, setSelectedTemplate] = useState(AI_ADAPTER_TEMPLATES[0].id);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [showResult, setShowResult] = useState(false);

  if (!aiSettings.enabled) {
    return (
      <EmptyState
        icon={Sparkles}
        title="AI 适配未启用"
        description="请在设置中配置 API Key 并开启 AI 功能"
      />
    );
  }

  if (!selectedElement) {
    return (
      <EmptyState
        icon={Sparkles}
        title="未选择元素"
        description="请先选择一个元素再使用 AI 适配"
      />
    );
  }

  const templateOptions = AI_ADAPTER_TEMPLATES.map((t) => ({
    value: t.id,
    label: t.label,
  }));

  const handleAdapt = async () => {
    if (!aiSettings.apiKey) {
      addToast('请先配置 API Key', 'warning');
      return;
    }
    setIsLoading(true);
    setResult('');
    setShowResult(false);
    try {
      // TODO: 接入真实 AI API
      await new Promise((r) => setTimeout(r, 1500));
      setResult(`<!-- AI 适配结果：${AI_ADAPTER_TEMPLATES.find((t) => t.id === selectedTemplate)?.label} -->
<div class="ai-adapted" style="padding: 1rem; border-radius: 0.5rem; background: rgba(91,141,239,0.08); border: 1px solid rgba(91,141,239,0.2);">
  <p style="margin: 0; color: inherit;">AI 已优化此元素结构</p>
</div>`);
      setShowResult(true);
      addToast('AI 适配完成', 'success');
    } catch {
      addToast('AI 请求失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!result.trim()) return;
    applyHtml(result.trim());
    setShowResult(false);
    addToast('已应用 AI 适配结果', 'success');
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="deck-label mb-2 block">适配目标</label>
        <ChipGroup
          options={templateOptions}
          value={selectedTemplate}
          onChange={(v) => { setSelectedTemplate(v); setCustomPrompt(''); }}
        />
      </div>

      <div>
        <label className="deck-label mb-2 block">自定义指令</label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="输入自定义 AI 指令，覆盖模板提示..."
          className="deck-input w-full h-24 resize-none text-[13px]"
        />
        <div className="text-right text-[10px] text-deck-text3 mt-1">{customPrompt.length} 字</div>
      </div>

      <button
        onClick={handleAdapt}
        disabled={isLoading}
        className="deck-btn w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /><span>AI 处理中...</span></>
        ) : (
          <><Sparkles className="w-4 h-4" /><span>开始 AI 适配</span></>
        )}
      </button>

      {showResult && (
        <div className="deck-glass-thin p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-deck-accent">适配结果</span>
            <IconButton icon={Copy} title="复制结果" onClick={() => navigator.clipboard.writeText(result)} size="sm" />
          </div>
          <pre className="text-[10px] text-deck-text3 bg-deck-fill p-2 rounded-xl overflow-auto max-h-40 font-mono">{result}</pre>
          <div className="flex gap-2 mt-3">
            <button onClick={handleApply} className="deck-btn flex-1 flex items-center justify-center gap-1 py-2">
              <Check className="w-3.5 h-3.5" /><span>应用</span>
            </button>
            <button onClick={() => setShowResult(false)} className="deck-btn-ghost flex-1 flex items-center justify-center gap-1 py-2">
              <X className="w-3.5 h-3.5" /><span>取消</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

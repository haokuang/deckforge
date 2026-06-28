import { useState } from 'react';
import { Image, Layout, Type, Sparkles, EyeOff, MousePointer2, PanelRightClose, PanelRightOpen, X, Copy, Check, Paintbrush } from 'lucide-react';
import { useStore } from '../../store';
import { TextToolPanel } from '../tools/TextToolPanel';
import { ImageToolPanel } from '../tools/ImageToolPanel';
import { LayoutToolPanel } from '../tools/LayoutToolPanel';
import { AiToolPanel } from '../tools/AiToolPanel';
import { EmptyState } from '../ui/EmptyState';
import { IconButton } from '../ui/IconButton';

const TOOL_TABS = [
  { id: 'text', label: '文字', icon: Type },
  { id: 'image', label: '图片', icon: Image },
  { id: 'layout', label: '布局', icon: Layout },
  { id: 'ai', label: 'AI', icon: Sparkles },
];

export function RightPanel() {
  const { rightPanelCollapsed, toggleRightPanel, selectedElement, isEditMode, selectElement, formatPainterSource, formatPainterActive, copyFormatPainter, applyFormatPainter } = useStore();
  const [activeTab, setActiveTab] = useState('text');
  const [copied, setCopied] = useState(false);

  if (rightPanelCollapsed) {
    return (
      <div className="w-12 deck-glass-thin flex flex-col items-center py-3 gap-2 shrink-0 anim-scale-in">
        <IconButton icon={PanelRightOpen} title="展开属性面板" onClick={toggleRightPanel} />
      </div>
    );
  }

  const handleCopySelector = async () => {
    if (!selectedElement?.selector) return;
    try {
      await navigator.clipboard.writeText(selectedElement.selector);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-72 deck-glass-thin flex flex-col shrink-0 anim-scale-in p-3">
      <div className="h-9 flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-deck-text2 uppercase tracking-wider">属性面板</span>
        <IconButton icon={PanelRightClose} title="收起属性面板" onClick={toggleRightPanel} size="sm" />
      </div>

      {!isEditMode ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={EyeOff}
            title="未进入编辑模式"
            description="点击工具栏的「编辑中」按钮开始修改属性"
          />
        </div>
      ) : !selectedElement ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={MousePointer2}
            title="未选择元素"
            description="在预览区点击任意元素即可编辑"
          />
        </div>
      ) : (
        <>
          <div className="px-3 py-2 mb-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-deck-accent/15 text-deck-accent text-[10px] font-mono font-medium">{selectedElement.tagName.toLowerCase()}</span>
              <span className="text-[10px] text-deck-text3 truncate flex-1" title={selectedElement.selector}>{selectedElement.selector}</span>
              <IconButton icon={copied ? Check : Copy} title="复制选择器" onClick={handleCopySelector} size="sm" />
              <IconButton
                icon={Paintbrush}
                title={formatPainterActive && formatPainterSource?.selector === selectedElement.selector ? '已复制格式，点击目标元素应用' : '复制该元素格式'}
                onClick={() => {
                  if (formatPainterActive && formatPainterSource && formatPainterSource.selector !== selectedElement.selector) {
                    applyFormatPainter(selectedElement);
                  } else {
                    copyFormatPainter();
                  }
                }}
                size="sm"
                active={formatPainterActive && formatPainterSource?.selector === selectedElement.selector}
              />
              <IconButton icon={X} title="清除选择" onClick={() => selectElement(null)} size="sm" />
            </div>
          </div>

          <div className="flex rounded-xl border border-white/[0.06] bg-white/[0.03] p-0.5 mb-2 overflow-hidden">
            {TOOL_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] rounded-lg transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                    ${active
                      ? 'bg-deck-accent/15 text-deck-accent'
                      : 'text-deck-text3 hover:text-deck-text hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 deck-scroll px-1">
            {activeTab === 'text' && <TextToolPanel />}
            {activeTab === 'image' && <ImageToolPanel />}
            {activeTab === 'layout' && <LayoutToolPanel />}
            {activeTab === 'ai' && <AiToolPanel />}
          </div>
        </>
      )}
    </div>
  );
}

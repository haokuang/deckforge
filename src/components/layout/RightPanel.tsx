import { useState } from 'react';
import { Image, Layout, Type, Sparkles, EyeOff, MousePointer2, PanelRightClose, PanelRightOpen, X, Copy, Check, Paintbrush, Trash2, Layers, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignLeft, AlignCenter, AlignRight, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter } from 'lucide-react';
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

const ALIGN_ACTIONS = [
  { mode: 'left', icon: AlignLeft, title: '左对齐' },
  { mode: 'hcenter', icon: AlignCenter, title: '水平居中' },
  { mode: 'right', icon: AlignRight, title: '右对齐' },
  { mode: 'top', icon: AlignStartVertical, title: '顶对齐' },
  { mode: 'vcenter', icon: AlignCenterVertical, title: '垂直居中' },
  { mode: 'bottom', icon: AlignEndVertical, title: '底对齐' },
  { mode: 'distribute-h', icon: AlignHorizontalDistributeCenter, title: '水平等距分布' },
  { mode: 'distribute-v', icon: AlignVerticalDistributeCenter, title: '垂直等距分布' },
] as const;

export function RightPanel() {
  const { rightPanelCollapsed, toggleRightPanel, selectedElement, isEditMode, selectElement, formatPainterSource, formatPainterActive, copyFormatPainter, applyFormatPainter, selectionCount, alignSelection, copySelectedElements, duplicateSelectedElements, deleteSelectedElements } = useStore();
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
      ) : (
        <>
          {selectedElement ? (
            <>
              <div className="px-3 py-2 mb-2 rounded-xl bg-deck-fill border border-deck-border">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-deck-accent/15 text-deck-accent text-[10px] font-mono font-medium">{selectedElement.tagName.toLowerCase()}</span>
                  <span className="text-[10px] text-deck-text3 truncate flex-1" title={selectedElement.selector}>{selectedElement.selector}</span>
                  {selectionCount > 1 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-deck-accent/15 text-deck-accent text-[10px] font-medium shrink-0">{selectionCount} 项</span>
                  )}
                  <IconButton icon={copied ? Check : Copy} title="复制选择器" onClick={() => void handleCopySelector()} size="sm" />
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
                  <IconButton icon={Copy} title="复制元素 (Ctrl+C)" onClick={copySelectedElements} size="sm" />
                  <IconButton icon={Layers} title="原位克隆 (Ctrl+D)" onClick={duplicateSelectedElements} size="sm" />
                  <IconButton icon={Trash2} title="删除元素 (Delete)" onClick={deleteSelectedElements} size="sm" />
                  <IconButton icon={X} title="清除选择" onClick={() => selectElement(null)} size="sm" />
                </div>
              </div>

              {selectionCount > 1 && (
                <div className="mb-2 px-3 py-2.5 rounded-xl bg-deck-fill border border-deck-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointer2 className="w-3 h-3 text-deck-accent" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-deck-text3">对齐与分布</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {ALIGN_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.mode}
                          type="button"
                          title={action.title}
                          onClick={() => alignSelection(action.mode)}
                          className="h-7 rounded-lg flex items-center justify-center bg-deck-border/60 text-deck-text2 hover:text-deck-accent hover:bg-deck-accent/10 transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mb-2">
              <EmptyState
                icon={MousePointer2}
                title="未选择元素"
                description="点击元素编辑样式；AI 面板可整页修改"
                className="py-3"
              />
            </div>
          )}

          <div className="flex rounded-xl border border-deck-border bg-deck-fill p-0.5 mb-2 overflow-hidden">
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
                      : 'text-deck-text3 hover:text-deck-text hover:bg-deck-fill-hover'
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

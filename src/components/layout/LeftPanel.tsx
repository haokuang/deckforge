import { useState } from 'react';
import { PanelLeftOpen, PanelLeftClose, Copy, Trash2, Plus, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { IconButton } from '../ui/IconButton';

export function LeftPanel() {
  const { leftPanelCollapsed, toggleLeftPanel, pages, currentPageIndex, selectPage, agentTask, insertSlideAfter, duplicateSlide, deleteSlide, moveSlide } = useStore();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (leftPanelCollapsed) {
    return (
      <div className="w-12 deck-glass-thin flex flex-col items-center py-3 gap-2 shrink-0 anim-scale-in">
        <IconButton icon={PanelLeftOpen} title="展开页面导航" onClick={toggleLeftPanel} />
        {pages.length > 0 && (
          <div className="mt-2 flex flex-col items-center gap-1">
            <span className="text-[10px] text-deck-text3">{currentPageIndex + 1}</span>
            <div className="w-1 h-1 rounded-full bg-deck-text3" />
            <span className="text-[10px] text-deck-text3">{pages.length}</span>
          </div>
        )}
      </div>
    );
  }

  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      moveSlide(dragIndex, targetIndex);
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <div className="w-56 deck-glass-thin flex flex-col shrink-0 anim-scale-in p-3">
      <div className="h-9 flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-deck-text2 uppercase tracking-wider">页面 ({pages.length})</span>
        <IconButton icon={PanelLeftClose} title="收起页面导航" onClick={toggleLeftPanel} size="sm" />
      </div>

      <div className="flex-1 deck-scroll space-y-1 pr-0.5">
        {pages.length === 0 ? (
          <div className="px-2 py-1 text-[11px] text-deck-text3">未识别到页面</div>
        ) : (
          pages.map((page, idx) => {
            const selected = currentPageIndex === idx;
            const locked = agentTask.status === 'running' && agentTask.pageIndex === idx;
            return (
              <div
                key={page.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => { e.preventDefault(); setDropIndex(idx); }}
                onDragLeave={() => setDropIndex((v) => (v === idx ? null : v))}
                onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
                onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
                onClick={() => selectPage(idx)}
                className={`
                  group flex items-center gap-2 px-2 py-2 rounded-xl border cursor-pointer transition-all
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50
                  ${selected
                    ? 'bg-deck-accent/10 border-deck-accent/50'
                    : 'border-transparent hover:bg-deck-fill'}
                  ${dropIndex === idx && dragIndex !== null && dragIndex !== idx ? 'ring-2 ring-deck-accent/70' : ''}
                  ${dragIndex === idx ? 'opacity-40' : ''}
                `}
              >
                <span className={`
                  w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-medium shrink-0
                  ${selected ? 'bg-deck-accent/25 text-deck-accent' : 'bg-deck-border text-deck-text3'}
                `}>
                  {idx + 1}
                </span>
                <span className="truncate text-[12px] text-deck-text2 flex-1">{page.title || `页面 ${idx + 1}`}</span>
                {locked ? (
                  <Loader2 className="w-3 h-3 text-deck-accent animate-spin shrink-0" />
                ) : (
                  <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      title="复制此页"
                      onClick={(e) => { e.stopPropagation(); duplicateSlide(idx); }}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-deck-text3 hover:text-deck-accent hover:bg-deck-accent/10"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="删除此页"
                      onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                      className="w-5 h-5 rounded-md flex items-center justify-center text-deck-text3 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {pages.length > 0 && (
        <button
          type="button"
          onClick={() => insertSlideAfter(currentPageIndex)}
          className="mt-2 deck-btn-glass flex items-center justify-center gap-1.5 py-2 text-[12px] shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增页面</span>
        </button>
      )}
    </div>
  );
}

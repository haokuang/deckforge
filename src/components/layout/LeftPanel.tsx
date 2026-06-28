import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { useStore } from '../../store';
import { IconButton } from '../ui/IconButton';

export function LeftPanel() {
  const { leftPanelCollapsed, toggleLeftPanel, pages, currentPageIndex, selectPage } = useStore();

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

  return (
    <div className="w-56 deck-glass-thin flex flex-col shrink-0 anim-scale-in p-3">
      <div className="h-9 flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-deck-text2 uppercase tracking-wider">页面 ({pages.length})</span>
        <IconButton icon={PanelLeftClose} title="收起页面导航" onClick={toggleLeftPanel} size="sm" />
      </div>

      <div className="flex-1 deck-scroll space-y-1">
        {pages.length === 0 ? (
          <div className="px-2 py-1 text-[11px] text-deck-text3">未识别到页面</div>
        ) : (
          pages.map((page, idx) => {
            const selected = currentPageIndex === idx;
            return (
              <button
                key={page.id}
                onClick={() => selectPage(idx)}
                className={`
                  w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12px] transition-all relative
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                  ${selected
                    ? 'bg-deck-accent/10 text-deck-text'
                    : 'text-deck-text2 hover:bg-white/[0.05] hover:text-deck-text'
                  }
                `}
              >
                {selected && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-deck-accent" />}
                <span className={`
                  w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-medium shrink-0
                  ${selected ? 'bg-deck-accent/20 text-deck-accent' : 'bg-white/[0.05] text-deck-text3'}
                `}>
                  {idx + 1}
                </span>
                <span className="truncate text-left flex-1">{page.title || `页面 ${idx + 1}`}</span>
                {page.type !== 'unknown' && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-md text-[9px] bg-white/[0.06] text-deck-text3 shrink-0">{page.type}</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

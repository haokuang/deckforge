import { useCallback } from 'react';
import { Upload, Save, RotateCcw, Undo2, Redo2, Edit3, Eye, Settings, Plus, Minus, Layers, Paintbrush, Moon, Sun, X } from 'lucide-react';
import { useStore } from '../../store';
import { APP_NAME, APP_NAME_CN } from '../../utils/constants';
import { IconButton } from '../ui/IconButton';

export function TopBar() {
  const { hasImported, isEditMode, zoom, undoCount, redoCount, selectedElement, formatPainterSource, formatPainterActive, formatPainterSticky, theme, setEditMode, setZoom, undo, redo, restoreOriginal, saveToFile, closeDocument, setShowSettings, setTheme, addToast, copyFormatPainter, toggleFormatPainter, setFormatPainterSticky, importPickedFiles } = useStore();

  const handleZoomIn = useCallback(() => { setZoom(Math.min(zoom + 25, 200)); }, [zoom, setZoom]);
  const handleZoomOut = useCallback(() => { setZoom(Math.max(zoom - 25, 25)); }, [zoom, setZoom]);

  return (
    <header className="relative h-[52px] flex items-center px-4 shrink-0 select-none z-50">
      <div className="absolute inset-x-0 top-0 h-[52px] deck-topbar" />

      <div className="relative z-10 flex items-center w-full">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-6">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-deck-accent to-[#7A9AE8] shadow-md shadow-deck-accent/15">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-tight tracking-tight">{APP_NAME}</span>
            <span className="text-[10px] text-deck-text3 leading-tight">{APP_NAME_CN}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          {hasImported ? (
            <button onClick={() => void closeDocument()} className="deck-btn-ghost flex items-center gap-1.5" title="关闭当前文档，返回主页（自动保留草稿）">
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">关闭</span>
            </button>
          ) : (
            <button onClick={() => void importPickedFiles()} className="deck-btn-ghost flex items-center gap-1.5" title="导入 HTML 文件">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导入</span>
            </button>
          )}

          {hasImported && (
            <>
              <div className="deck-divider-v" />
              <button
                onClick={() => {
                  const next = !isEditMode;
                  setEditMode(next);
                  // 退出编辑时自动保存到本地文件
                  if (!next) void saveToFile();
                }}
                className={`deck-btn-ghost flex items-center gap-1.5 whitespace-nowrap ${isEditMode ? 'deck-btn-ghost-active' : ''}`}
                title={isEditMode ? '退出编辑并保存' : '进入编辑模式'}
              >
                {isEditMode ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isEditMode ? '退出编辑' : '进入编辑'}</span>
              </button>
              <button
                onClick={() => {
                  if (!formatPainterActive && selectedElement) {
                    copyFormatPainter();
                  } else {
                    toggleFormatPainter();
                  }
                }}
                onDoubleClick={() => {
                  if (!formatPainterSource && selectedElement) {
                    copyFormatPainter();
                  }
                  setFormatPainterSticky(!formatPainterSticky);
                  addToast(formatPainterSticky ? '已退出连续格式刷' : '已进入连续格式刷模式', 'info');
                }}
                className={`
                  deck-btn-ghost flex items-center gap-1.5
                  ${formatPainterActive ? 'deck-btn-ghost-active text-deck-accent' : ''}
                  ${formatPainterSticky ? 'ring-1 ring-deck-accent/50' : ''}
                `}
                title={formatPainterActive ? '退出格式刷 (Shift+双击连续)' : '复制格式 (双击连续模式)'}
                disabled={!isEditMode}
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{formatPainterActive ? '格式刷中' : '格式刷'}</span>
              </button>
              <button
                onClick={() => void saveToFile()}
                className="deck-btn-ghost flex items-center gap-1.5"
                title="保存到本地原文件（导入时选择了文件则直接写回）"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">保存</span>
              </button>
              <IconButton icon={RotateCcw} title="恢复原始" onClick={() => { restoreOriginal(); addToast('已恢复', 'warning'); }} />
              <div className="deck-divider-v" />
              <IconButton icon={Undo2} title="撤销 (Ctrl+Z)" onClick={undo} disabled={undoCount === 0} />
              <IconButton icon={Redo2} title="重做 (Ctrl+Shift+Z)" onClick={redo} disabled={redoCount === 0} />
            </>
          )}
        </div>

        {/* 缩放控制放在右侧常规流中，避免绝对居中时与左侧按钮重叠 */}
        <div className="flex items-center gap-1 ml-auto">
          {hasImported && (
            <div className="flex items-center gap-1 mr-2">
              <IconButton icon={Minus} title="缩小" onClick={handleZoomOut} size="sm" />
              <span className="text-[11px] text-deck-text2 w-10 text-center tabular-nums">{zoom}%</span>
              <IconButton icon={Plus} title="放大" onClick={handleZoomIn} size="sm" />
            </div>
          )}
          <IconButton
            icon={theme === 'dark' ? Sun : Moon}
            title={theme === 'dark' ? '切换到浅色界面' : '切换到深色界面'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
          <IconButton icon={Settings} title="设置" onClick={() => setShowSettings(true)} />
        </div>
      </div>
    </header>
  );
}

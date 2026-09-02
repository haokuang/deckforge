import { useRef, useCallback } from 'react';
import { Upload, Save, RotateCcw, Undo2, Redo2, Edit3, Eye, Settings, Plus, Minus, FileArchive, FileCode, Layers, Paintbrush, GitFork, Moon, Sun } from 'lucide-react';
import { useStore } from '../../store';
import { APP_NAME, APP_NAME_CN } from '../../utils/constants';
import { IconButton } from '../ui/IconButton';

export function TopBar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasImported, isEditMode, zoom, undoStack, redoStack, selectedElement, formatPainterSource, formatPainterActive, formatPainterSticky, repository, theme, setEditMode, setZoom, undo, redo, restoreOriginal, exportZip, exportSingleHtml, saveToFile, setShowSettings, setShowRepositoryModal, setTheme, addToast, copyFormatPainter, toggleFormatPainter, setFormatPainterSticky } = useStore();

  const handleImportClick = useCallback(() => { fileInputRef.current?.click(); }, []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (files && files.length > 0) { useStore.getState().importFiles(files); }
  }, []);
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
          <button onClick={handleImportClick} className="deck-btn-ghost flex items-center gap-1.5" title="导入文件">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导入</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".html,.htm,.zip" multiple className="sr-only" onChange={handleFileChange} />
          <button
            onClick={() => setShowRepositoryModal(true)}
            className={`deck-btn-ghost flex items-center gap-1.5 ${repository.binding ? 'deck-btn-ghost-active' : ''}`}
            title={repository.binding ? `已连接 ${repository.binding.owner}/${repository.binding.repo}` : '绑定 GitHub PPT 仓库'}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span className="hidden md:inline max-w-28 truncate">
              {repository.binding ? repository.binding.repo : 'PPT 仓库'}
            </span>
          </button>

          {hasImported && (
            <>
              <div className="deck-divider-v" />
              <button
                onClick={() => setEditMode(!isEditMode)}
                className={`deck-btn-ghost flex items-center gap-1.5 w-[88px] justify-center ${isEditMode ? 'deck-btn-ghost-active' : ''}`}
                title={isEditMode ? '退出编辑' : '进入编辑'}
              >
                {isEditMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isEditMode ? '编辑中' : '预览'}</span>
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
                title={repository.currentFile ? `保存原文件并提交：${repository.currentFile.path}` : '绑定仓库并从仓库打开 PPT 后保存'}
                disabled={repository.isLoading}
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">提交保存</span>
              </button>
              <button onClick={() => void exportZip()} className="deck-btn-ghost flex items-center gap-1.5" title="导出 ZIP">
                <FileArchive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ZIP</span>
              </button>
              <button onClick={() => void exportSingleHtml()} className="deck-btn-ghost flex items-center gap-1.5" title="导出单 HTML">
                <FileCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">单 HTML</span>
              </button>
              <IconButton icon={RotateCcw} title="恢复原始" onClick={() => { restoreOriginal(); addToast('已恢复', 'warning'); }} />
              <div className="deck-divider-v" />
              <IconButton icon={Undo2} title="撤销" onClick={undo} disabled={undoStack.length === 0} />
              <IconButton icon={Redo2} title="重做" onClick={redo} disabled={redoStack.length === 0} />
            </>
          )}
        </div>

        {/* 缩放控制 — 绝对居中 */}
        {hasImported && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden 2xl:flex items-center gap-1">
            <IconButton icon={Minus} title="缩小" onClick={handleZoomOut} size="sm" />
            <span className="text-[11px] text-deck-text2 w-10 text-center tabular-nums">{zoom}%</span>
            <IconButton icon={Plus} title="放大" onClick={handleZoomIn} size="sm" />
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
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

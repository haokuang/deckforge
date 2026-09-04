import { useState, useCallback, useEffect } from 'react';
import { Upload, FileCode, Layers, Save, History, Trash2, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { APP_NAME, APP_NAME_CN } from '../../utils/constants';

export function FileDropZone() {
  const { importFiles, importPickedFiles, draftInfo, restoreDraft, discardDraft, loadDraftInfo } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    void loadDraftInfo();
  }, [loadDraftInfo]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dataTransfer = e.dataTransfer;
    // 优先抓取文件句柄，保存时可直接写回原文件
    const items = Array.from(dataTransfer.items ?? []);
    const firstItem = items[0] as (DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemFileHandle | null> }) | undefined;
    if (firstItem?.getAsFileSystemHandle) {
      const handleMap = new Map<string, FileSystemFileHandle>();
      const files: File[] = [];
      for (const item of items) {
        const handle = await (item as DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemFileHandle | null> }).getAsFileSystemHandle?.();
        if (handle && handle.kind === 'file') {
          const file = await handle.getFile();
          if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
            handleMap.set(file.name, handle);
            files.push(file);
          }
        }
      }
      if (files.length > 0) {
        void importFiles(files, handleMap);
        return;
      }
    }
    if (dataTransfer.files.length > 0) importFiles(dataTransfer.files);
  }, [importFiles]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 anim-fade-in-up">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-deck-accent to-[#7A9AE8] shadow-xl shadow-deck-accent/15">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {APP_NAME} <span className="bg-gradient-to-r from-deck-accent to-[#9B8BD0] bg-clip-text text-transparent">{APP_NAME_CN}</span>
          </h1>
          <p className="text-deck-text2 text-[15px] mb-1">零代码、所见即所得的 HTML 演示稿可视化编辑器</p>
          <p className="text-deck-text3 text-[13px]">纯本地运行，文件不上传服务器</p>
        </div>

        {draftInfo && (
          <div className="deck-glass-thin p-4 mb-4 flex items-center gap-4 border border-deck-accent/25">
            <div className="w-11 h-11 rounded-xl bg-deck-accent/15 border border-deck-accent/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-deck-accent" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="text-[13px] font-semibold block">检测到上次未导出的草稿</span>
              <span className="text-[11px] text-deck-text3 mt-1 block">
                保存于 {new Date(draftInfo.savedAt).toLocaleString()} · 恢复后可继续编辑或保存
              </span>
            </span>
            <button onClick={() => void restoreDraft()} className="deck-btn px-4 py-2 text-[12px] flex items-center gap-1.5 shrink-0">
              <History className="w-3.5 h-3.5" /><span>恢复草稿</span>
            </button>
            <button
              onClick={() => void discardDraft()}
              title="丢弃草稿"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-deck-text3 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            deck-glass p-12 text-center transition-all duration-300
            ${isDragging ? 'border-deck-accent/40 bg-deck-accent/[0.03] scale-[1.02]' : ''}
          `}
        >
          <Upload className={`w-10 h-10 mx-auto mb-4 transition-colors ${isDragging ? 'text-deck-accent' : 'text-deck-text2'}`} />
          <p className="text-lg font-medium mb-1">导入本地文件</p>
          <p className="text-[13px] text-deck-text3 mb-6">拖拽 HTML 到此处，或点击下方按钮选择；保存时可直接写回原文件</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => void importPickedFiles()} className="deck-btn flex items-center gap-2">
              <FileCode className="w-4 h-4" /><span>选择 HTML</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8 text-center">
          {[
            { icon: Save, title: '原文件保存', desc: '通过文件句柄直接写回原 HTML' },
            { icon: Sparkles, title: 'AI 智能编辑', desc: '连接本地 Codex，自然语言修改页面' },
            { icon: History, title: '自动保存草稿', desc: '编辑过程自动暂存，随时恢复' },
          ].map((item) => (
            <div key={item.title}>
              <item.icon className="w-4 h-4 text-deck-text3 mx-auto mb-1.5" />
              <h3 className="text-[12px] font-medium text-deck-text2 mb-0.5">{item.title}</h3>
              <p className="text-[11px] text-deck-text3">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Upload, FileArchive, FolderOpen, FileCode, Layers, GitFork, GitCommitHorizontal } from 'lucide-react';
import { useStore } from '../../store';
import { APP_NAME, APP_NAME_CN } from '../../utils/constants';

export function FileDropZone() {
  const { importFiles, importDirectory, addToast, repository, setShowRepositoryModal } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) importFiles(e.dataTransfer.files); }, [importFiles]);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (files && files.length > 0) importFiles(files); }, [importFiles]);
  const handleFolderSelect = useCallback(async () => { try { await importDirectory(); } catch { addToast('请使用 Chrome 或 Edge 浏览器', 'warning'); } }, [importDirectory, addToast]);

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
          <p className="text-deck-text3 text-[13px]">本地导入不上传；绑定仓库后仅与 GitHub API 通信</p>
        </div>

        <button
          onClick={() => setShowRepositoryModal(true)}
          className="w-full deck-glass p-5 mb-4 flex items-center gap-4 text-left hover:border-deck-accent/30 transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-deck-accent/15 border border-deck-accent/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <GitFork className="w-5 h-5 text-deck-accent" />
          </div>
          <span className="min-w-0 flex-1">
            <span className="text-[14px] font-semibold block">
              {repository.binding ? `打开 ${repository.binding.owner}/${repository.binding.repo}` : '绑定 GitHub PPT 仓库'}
            </span>
            <span className="text-[11px] text-deck-text3 mt-1 block">
              推荐工作流：从仓库打开 HTML，保存到原路径，并自动创建 Git commit
            </span>
          </span>
          <GitCommitHorizontal className="w-5 h-5 text-deck-text3 group-hover:text-deck-accent transition-colors" />
        </button>

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
          <p className="text-lg font-medium mb-1">临时导入本地文件</p>
          <p className="text-[13px] text-deck-text3 mb-6">可编辑和导出；若要原路径保存及版本回溯，请使用上方仓库模式</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="deck-btn cursor-pointer flex items-center gap-2">
              <FileCode className="w-4 h-4" /><span>选择 HTML</span>
              <input type="file" accept=".html,.htm" className="sr-only" onChange={handleFileInput} />
            </label>
            <label className="deck-btn-glass cursor-pointer flex items-center gap-2">
              <FileArchive className="w-4 h-4" /><span>选择 ZIP</span>
              <input type="file" accept=".zip" className="sr-only" onChange={handleFileInput} />
            </label>
            <button onClick={handleFolderSelect} className="deck-btn-glass flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /><span>选择文件夹</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { icon: FileCode, title: '仓库原位保存', desc: '更新原 HTML，不再生成重复下载' },
            { icon: FileArchive, title: '解析 ZIP', desc: '自动解压并识别多页面结构' },
            { icon: GitCommitHorizontal, title: '自动版本记录', desc: '每次保存生成 GitHub commit' },
          ].map((item) => (
            <div
              key={item.title}
              className="deck-glass-thin p-5 text-center transition-all duration-300 hover:-translate-y-1"
            >
              <item.icon className="w-5 h-5 text-deck-accent mx-auto mb-2" />
              <h3 className="text-[13px] font-semibold mb-1">{item.title}</h3>
              <p className="text-[11px] text-deck-text3">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

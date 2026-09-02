import { useEffect, useState } from 'react';
import {
  BookOpen, ExternalLink, FileCode2, GitBranch, GitFork,
  KeyRound, Loader2, LogOut, RefreshCw, Save, X,
} from 'lucide-react';
import { useStore } from '../../store';
import { IconButton } from './IconButton';

export function RepositoryModal() {
  const {
    showRepositoryModal,
    repository,
    setShowRepositoryModal,
    connectRepository,
    refreshRepositoryFiles,
    openRepositoryFile,
    disconnectRepository,
  } = useStore();
  const [repositoryName, setRepositoryName] = useState('');
  const [branch, setBranch] = useState('');
  const [folder, setFolder] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!repository.binding) return;
    setRepositoryName(`${repository.binding.owner}/${repository.binding.repo}`);
    setBranch(repository.binding.branch);
    setFolder(repository.binding.folder);
    setToken('');
  }, [repository.binding]);

  if (!showRepositoryModal) return null;

  const handleConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    await connectRepository({ repository: repositoryName, branch, folder, token });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={() => setShowRepositoryModal(false)}
        aria-label="关闭 GitHub 仓库"
      />

      <section
        className="relative w-full max-w-2xl mx-4 deck-glass-thick overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repository-title"
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-deck-accent/15 border border-deck-accent/20 flex items-center justify-center">
              <GitFork className="w-5 h-5 text-deck-accent" />
            </div>
            <div>
              <h2 id="repository-title" className="text-[15px] font-semibold">PPT 版本仓库</h2>
              <p className="text-[11px] text-deck-text3 mt-0.5">原路径保存，每次保存自动创建 Git commit</p>
            </div>
          </div>
          <IconButton icon={X} title="关闭" onClick={() => setShowRepositoryModal(false)} />
        </header>

        {!repository.binding ? (
          <form onSubmit={handleConnect} className="p-6 space-y-5">
            <div className="deck-glass-thin rounded-2xl p-4 flex gap-3">
              <GitBranch className="w-5 h-5 text-deck-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium">先绑定一个专门存放 PPT 的 GitHub 仓库</p>
                <p className="text-[11px] text-deck-text3 leading-relaxed mt-1">
                  建议把所有单文件 HTML 演示稿放进同一仓库或指定目录。DeckForge 从仓库打开文件后，保存会覆盖同一路径并留下 commit，可随时在 GitHub 回溯。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="col-span-2">
                <span className="deck-label mb-2 block">GitHub 仓库</span>
                <div className="relative">
                  <GitFork className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    value={repositoryName}
                    onChange={(event) => setRepositoryName(event.target.value)}
                    className="deck-input w-full pl-10"
                    placeholder="owner/repo 或 GitHub 仓库 URL"
                    required
                    autoFocus
                  />
                </div>
              </label>

              <label>
                <span className="deck-label mb-2 block">分支</span>
                <input
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  className="deck-input w-full"
                  placeholder="留空使用默认分支"
                />
              </label>

              <label>
                <span className="deck-label mb-2 block">PPT 目录</span>
                <input
                  value={folder}
                  onChange={(event) => setFolder(event.target.value)}
                  className="deck-input w-full"
                  placeholder="例如 presentations"
                />
              </label>

              <label className="col-span-2">
                <span className="deck-label mb-2 block">GitHub Token</span>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    type="password"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className="deck-input w-full pl-10"
                    placeholder="Fine-grained token（Contents: Read and write）"
                    required
                  />
                </div>
                <p className="text-[10px] text-deck-text3 mt-2">
                  Token 仅保存在当前页面内存中，刷新后需重新填写；请求直接发送至 GitHub API。
                </p>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button type="button" className="deck-btn-ghost" onClick={() => setShowRepositoryModal(false)}>取消</button>
              <button type="submit" className="deck-btn flex items-center gap-2" disabled={repository.isLoading}>
                {repository.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                <span>{repository.isLoading ? '正在连接...' : '连接并读取 PPT'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[13px] font-medium truncate">
                    {repository.binding.owner}/{repository.binding.repo}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] text-[10px] text-deck-text3">
                    {repository.binding.branch}
                  </span>
                </div>
                <p className="text-[11px] text-deck-text3 mt-1">
                  {repository.binding.folder ? `目录：${repository.binding.folder}` : '扫描整个仓库'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton icon={RefreshCw} title="刷新文件列表" onClick={() => void refreshRepositoryFiles()} disabled={repository.isLoading} />
                <IconButton icon={LogOut} title="断开仓库" onClick={disconnectRepository} />
              </div>
            </div>

            <div className="deck-glass-thin rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-deck-text2">
                  HTML 演示稿 ({repository.files.length})
                </span>
                {repository.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-deck-accent" />}
              </div>
              <div className="max-h-[45vh] overflow-y-auto deck-scroll p-2">
                {repository.files.length === 0 ? (
                  <div className="py-12 text-center">
                    <BookOpen className="w-8 h-8 mx-auto text-deck-text3 mb-3" />
                    <p className="text-[13px]">没有找到 HTML 文件</p>
                    <p className="text-[11px] text-deck-text3 mt-1">请向仓库或配置的 PPT 目录添加 .html 文件</p>
                  </div>
                ) : repository.files.map((file) => {
                  const isCurrent = repository.currentFile?.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => void openRepositoryFile(file)}
                      disabled={repository.isLoading}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                        isCurrent ? 'bg-deck-accent/12 text-white' : 'hover:bg-white/[0.05] text-deck-text2'
                      }`}
                    >
                      <FileCode2 className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-deck-accent' : 'text-deck-text3'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="text-[12px] block truncate">{file.name}</span>
                        <span className="text-[10px] text-deck-text3 block truncate mt-0.5">{file.path}</span>
                      </span>
                      <span className="text-[10px] text-deck-text3 tabular-nums">{formatBytes(file.size)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {repository.lastCommitUrl && (
              <a
                href={repository.lastCommitUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center gap-2 text-[11px] text-deck-accent hover:underline"
              >
                <Save className="w-3.5 h-3.5" />
                查看最近一次保存提交
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

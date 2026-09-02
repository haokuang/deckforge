import type { GitHubRepositoryBinding, RepositoryHtmlFile } from '../types';

const GITHUB_API = 'https://api.github.com';

interface GitHubRepositoryResponse {
  default_branch: string;
}

interface GitHubTreeResponse {
  truncated: boolean;
  tree: Array<{
    path: string;
    mode: string;
    type: 'blob' | 'tree' | 'commit';
    sha: string;
    size?: number;
  }>;
}

interface GitHubBlobResponse {
  sha: string;
  size: number;
  encoding: string;
  content: string;
}

interface GitHubCommitResponse {
  content?: {
    sha: string;
  };
  commit: {
    sha: string;
    html_url: string;
  };
}

export interface RepositoryConnectionInput {
  repository: string;
  token: string;
  branch?: string;
  folder?: string;
}

export interface LoadedRepositoryHtml {
  file: RepositoryHtmlFile;
  content: string;
}

export interface SavedRepositoryHtml {
  fileSha: string;
  commitSha: string;
  commitUrl: string;
}

export async function connectGitHubRepository(
  input: RepositoryConnectionInput,
): Promise<{ binding: GitHubRepositoryBinding; files: RepositoryHtmlFile[] }> {
  const { owner, repo } = parseRepositoryName(input.repository);
  const token = input.token.trim();
  if (!token) throw new Error('请输入 GitHub Token');

  const repository = await githubRequest<GitHubRepositoryResponse>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    token,
  );
  const binding: GitHubRepositoryBinding = {
    owner,
    repo,
    token,
    branch: input.branch?.trim() || repository.default_branch,
    folder: normalizeFolder(input.folder || ''),
  };
  const files = await listRepositoryHtmlFiles(binding);
  return { binding, files };
}

export async function listRepositoryHtmlFiles(
  binding: GitHubRepositoryBinding,
): Promise<RepositoryHtmlFile[]> {
  const branch = await githubRequest<{ commit: { commit: { tree: { sha: string } } } }>(
    `/repos/${encodeURIComponent(binding.owner)}/${encodeURIComponent(binding.repo)}/branches/${encodeURIComponent(binding.branch)}`,
    binding.token,
  );
  const treeSha = branch.commit.commit.tree.sha;
  const tree = await githubRequest<GitHubTreeResponse>(
    `/repos/${encodeURIComponent(binding.owner)}/${encodeURIComponent(binding.repo)}/git/trees/${treeSha}?recursive=1`,
    binding.token,
  );
  if (tree.truncated) {
    throw new Error('仓库文件过多，GitHub 未返回完整目录；请设置更具体的 PPT 目录');
  }

  const folderPrefix = binding.folder ? `${binding.folder}/` : '';
  return tree.tree
    .filter((item) => item.type === 'blob')
    .filter((item) => !folderPrefix || item.path.startsWith(folderPrefix))
    .filter((item) => /\.html?$/i.test(item.path))
    .map((item) => ({
      name: item.path.split('/').pop() || item.path,
      path: item.path,
      sha: item.sha,
      size: item.size || 0,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function loadRepositoryHtml(
  binding: GitHubRepositoryBinding,
  file: RepositoryHtmlFile,
): Promise<LoadedRepositoryHtml> {
  // 使用 Git Blobs API，避免 Contents API 对 1 MB 以上文件不返回 Base64 内容。
  // 单文件 HTML PPT 经常内嵌图片，体积可能明显超过 1 MB。
  const response = await githubRequest<GitHubBlobResponse>(
    `/repos/${encodeURIComponent(binding.owner)}/${encodeURIComponent(binding.repo)}/git/blobs/${file.sha}`,
    binding.token,
  );
  if (response.encoding !== 'base64' || !response.content) {
    throw new Error('GitHub 未返回可编辑的 HTML 文件内容');
  }
  return {
    file: {
      name: file.name,
      path: file.path,
      sha: response.sha,
      size: response.size,
    },
    content: decodeBase64Utf8(response.content),
  };
}

export async function saveRepositoryHtml(
  binding: GitHubRepositoryBinding,
  file: RepositoryHtmlFile,
  html: string,
): Promise<SavedRepositoryHtml> {
  const response = await githubRequest<GitHubCommitResponse>(
    `/repos/${encodeURIComponent(binding.owner)}/${encodeURIComponent(binding.repo)}/contents/${encodeRepositoryPath(file.path)}`,
    binding.token,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: `chore(ppt): update ${file.name} via DeckForge`,
        content: encodeBase64Utf8(html),
        sha: file.sha,
        branch: binding.branch,
      }),
    },
  );
  return {
    fileSha: response.content?.sha || file.sha,
    commitSha: response.commit.sha,
    commitUrl: response.commit.html_url,
  };
}

function parseRepositoryName(value: string): { owner: string; repo: string } {
  const trimmed = value.trim().replace(/\.git$/i, '').replace(/\/$/, '');
  const match = trimmed.match(/^(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s]+)$/i);
  if (!match) throw new Error('仓库格式应为 owner/repo 或完整 GitHub URL');
  return { owner: match[1], repo: match[2] };
}

function normalizeFolder(folder: string): string {
  return folder.trim().replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

function encodeRepositoryPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function githubRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    if (response.status === 401) throw new Error('GitHub Token 无效或已过期');
    if (response.status === 403) throw new Error('Token 没有该仓库的 Contents 读写权限');
    if (response.status === 404) throw new Error('找不到仓库、分支或文件，请检查配置与权限');
    if (response.status === 409 || response.status === 422) {
      throw new Error('远端文件已更新，请刷新仓库后重新打开再保存');
    }
    throw new Error(body?.message || `GitHub 请求失败（${response.status}）`);
  }
  return await response.json() as T;
}

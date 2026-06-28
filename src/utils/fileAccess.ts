/**
 * File System Access API 封装
 * 提供浏览器本地文件系统访问能力
 */

import type { FileNode } from '../types';

/**
 * 检查浏览器是否支持 File System Access API
 */
export function supportsFileSystemAccess(): boolean {
  return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window;
}

/**
 * 使用 File System Access API 选择文件夹
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!supportsFileSystemAccess()) {
    throw new Error('浏览器不支持 File System Access API');
  }
  return await (window as any).showDirectoryPicker();
}

/**
 * 递归读取文件夹内容
 */
export async function readDirectoryRecursively(
  dirHandle: FileSystemDirectoryHandle,
  path = ''
): Promise<FileNode[]> {
  const nodes: FileNode[] = [];

  for await (const [name, handle] of (dirHandle as any).entries()) {
    const currentPath = path ? `${path}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await readDirectoryRecursively(handle, currentPath);
      nodes.push({
        id: crypto.randomUUID(),
        name,
        path: currentPath,
        type: 'directory',
        children,
      });
      nodes.push(...children);
    } else {
      const file = await handle.getFile();
      nodes.push({
        id: crypto.randomUUID(),
        name,
        path: currentPath,
        type: 'file',
        content: await file.arrayBuffer(),
        mimeType: file.type || guessMimeType(name),
        isMainHtml: name.toLowerCase() === 'index.html' || name.toLowerCase() === 'main.html',
      });
    }
  }

  return nodes;
}

/**
 * 使用 File System Access API 保存文件
 */
export async function saveFileToDisk(
  suggestedName: string,
  content: Blob | string
): Promise<void> {
  if (!supportsFileSystemAccess()) {
    // Fallback: 触发下载
    const blob = typeof content === 'string' ? new Blob([content], { type: 'text/html' }) : content;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const handle = await (window as any).showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: 'HTML Files',
        accept: { 'text/html': ['.html', '.htm'] },
      },
      {
        description: 'ZIP Files',
        accept: { 'application/zip': ['.zip'] },
      },
    ],
  });

  const writable = await handle.createWritable();
  const blob = typeof content === 'string' ? new Blob([content]) : content;
  await writable.write(blob);
  await writable.close();
}

/**
 * 猜测 MIME 类型
 */
function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css', js: 'text/javascript',
    json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * 触发浏览器下载
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

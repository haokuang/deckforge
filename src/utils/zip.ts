import JSZip from 'jszip';
import type { FileNode } from '../types';

/**
 * 解析 ZIP 文件为虚拟文件树
 */
export async function parseZip(file: File): Promise<FileNode[]> {
  const zip = await JSZip.loadAsync(file);
  const root: FileNode[] = [];

  const pathMap = new Map<string, FileNode>();

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    const parts = path.split('/').filter(Boolean);
    const name = parts[parts.length - 1];

    const node: FileNode = {
      id: crypto.randomUUID(),
      name,
      path,
      type: 'file',
      content: await entry.async('arraybuffer'),
      mimeType: guessMimeType(name),
      isMainHtml: name.toLowerCase() === 'index.html' || name.toLowerCase() === 'main.html',
    };

    if (parts.length === 1) {
      root.push(node);
    } else {
      // 简化处理：扁平化放入 root
      root.push(node);
    }
  }

  return root;
}

/**
 * 将文件树打包为 ZIP
 */
export async function createZip(fileTree: FileNode[]): Promise<Blob> {
  const zip = new JSZip();

  for (const node of fileTree) {
    if (node.type === 'file' && node.content) {
      if (typeof node.content === 'string') {
        zip.file(node.path, node.content);
      } else {
        zip.file(node.path, node.content);
      }
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

/**
 * 猜测 MIME 类型
 */
function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'text/html', htm: 'text/html',
    css: 'text/css', js: 'text/javascript',
    json: 'application/json', xml: 'text/xml',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
    mp4: 'video/mp4', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav',
    pdf: 'application/pdf', zip: 'application/zip',
    ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * 从 FileList 构建文件树（单文件导入）
 */
export function buildFileTreeFromFiles(files: FileList): FileNode[] {
  return Array.from(files).map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    path: file.name,
    type: 'file',
    content: undefined, // 懒加载
    mimeType: file.type || guessMimeType(file.name),
    isMainHtml: file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm'),
  }));
}

/**
 * 读取文件内容为文本
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * 读取文件内容为 ArrayBuffer
 */
export function readFileAsBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

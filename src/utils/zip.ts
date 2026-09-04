import type { FileNode } from '../types';

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
    pdf: 'application/pdf',
    ttf: 'font/ttf', woff: 'font/woff', woff2: 'font/woff2',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * 从 FileList 构建文件树（单文件导入）
 */
export function buildFileTreeFromFiles(files: FileList | File[]): FileNode[] {
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

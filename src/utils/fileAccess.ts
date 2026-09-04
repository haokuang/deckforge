/**
 * File System Access API 封装
 * 提供浏览器本地文件系统访问能力
 */

/**
 * 检查浏览器是否支持 File System Access API
 */
export function supportsFileSystemAccess(): boolean {
  return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window;
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

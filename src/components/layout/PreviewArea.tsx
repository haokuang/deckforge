import { useRef, useEffect, useState } from 'react';
import { useStore } from '../../store';
import { injectEditorBridge } from '../../utils/dom';

const DEFAULT_SLIDE_WIDTH = 1920;
const DEFAULT_SLIDE_HEIGHT = 1080;

export function PreviewArea() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const { zoom, isEditMode, currentPageIndex, pages, hasImported, fileTree, currentFile, selectElement, formatPainterActive, formatPainterSource, applyFormatPainter, clearFormatPainter, setZoom } = useStore();
  const [iframeSize, setIframeSize] = useState({ width: DEFAULT_SLIDE_WIDTH, height: DEFAULT_SLIDE_HEIGHT });

  // 只在文件/内容变化时加载 iframe，不依赖页面索引和编辑模式
  useEffect(() => {
    if (!iframeRef.current || !hasImported || !currentFile) return;
    const iframe = iframeRef.current;
    const htmlNode = fileTree.find((n) => n.path === currentFile);
    if (!htmlNode || !htmlNode.content) return;

    loadedRef.current = false;

    const rawContent = typeof htmlNode.content === 'string' ? htmlNode.content : new TextDecoder().decode(htmlNode.content);
    const designSize = detectDesignSize(rawContent);
    const prepared = prepareIframeContent(rawContent, fileTree, htmlNode.path, designSize);

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const blob = new Blob([prepared], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    blobUrlRef.current = blobUrl;

    iframe.src = blobUrl;

    iframe.onload = () => {
      injectEditorBridge(iframe);
      if (iframe.contentWindow) {
        useStore.getState().setIframeWindow(iframe.contentWindow);
        loadedRef.current = true;
        const state = useStore.getState();
        iframe.contentWindow.postMessage({ type: 'DECKFORGE_SET_EDIT_MODE', enabled: state.isEditMode }, '*');
        iframe.contentWindow.postMessage({ type: 'DECKFORGE_SHOW_PAGE', index: state.currentPageIndex }, '*');

        // 尝试读取 iframe 内容尺寸并自适应缩放
        try {
          const body = iframe.contentDocument?.body;
          const slide = iframe.contentDocument?.querySelector('section, .slide, .page, .deck');
          const target = slide || body;
          if (target) {
            const rect = target.getBoundingClientRect();
            const nextWidth = rect.width > 0 ? Math.round(rect.width) : designSize.width;
            const nextHeight = rect.height > 0 ? Math.round(rect.height) : designSize.height;
            setIframeSize({ width: nextWidth, height: nextHeight });
            fitZoomToContainer(containerRef.current, nextWidth, nextHeight, setZoom);
          } else {
            setIframeSize(designSize);
            fitZoomToContainer(containerRef.current, designSize.width, designSize.height, setZoom);
          }
        } catch {
          // cross-origin 或安全策略限制时忽略
          setIframeSize(designSize);
        }
      }
    };

    return () => {
      loadedRef.current = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [hasImported, currentFile, fileTree, setZoom]);

  // 同步编辑模式到 iframe（仅当 iframe 已加载）
  useEffect(() => {
    if (!loadedRef.current) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'DECKFORGE_SET_EDIT_MODE', enabled: isEditMode }, '*');
  }, [isEditMode]);

  // 同步页面切换到 iframe（仅当 iframe 已加载）
  useEffect(() => {
    if (!loadedRef.current) return;
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || pages.length === 0) return;
    iframe.contentWindow.postMessage({ type: 'DECKFORGE_SHOW_PAGE', index: currentPageIndex }, '*');
  }, [currentPageIndex, pages]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || !e.data.type) return;
      if (e.data.type === 'ELEMENT_SELECTED') {
        const info = { tagName: e.data.tagName, selector: e.data.selector, textContent: e.data.textContent, isTextEditable: e.data.isTextEditable, isImage: e.data.isImage, computedStyles: e.data.computedStyles || {}, rect: e.data.rect || { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => '' } };
        // 格式刷激活时：先应用格式，再更新选中元素
        if (formatPainterActive && formatPainterSource && formatPainterSource.selector !== info.selector) {
          selectElement(info);
          applyFormatPainter(info);
        } else {
          selectElement(info);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => { window.removeEventListener('message', handleMessage); useStore.getState().setIframeWindow(null); };
  }, [selectElement, formatPainterActive, formatPainterSource, applyFormatPainter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasImported) return;
      const isMeta = e.ctrlKey || e.metaKey;
      if (isMeta && e.key === 's') { e.preventDefault(); useStore.getState().saveToFile(); }
      if (isMeta && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useStore.getState().redo();
        } else {
          useStore.getState().undo();
        }
      }
      if (isMeta && e.key === 'e') {
        e.preventDefault();
        const state = useStore.getState();
        state.setEditMode(!state.isEditMode);
      }
      if (e.key === 'Escape') {
        if (formatPainterActive) { clearFormatPainter(); }
        else { selectElement(null); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasImported, selectElement, formatPainterActive, clearFormatPainter]);

  if (!hasImported) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div ref={containerRef} className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="relative transition-transform duration-300 origin-center" style={{ transform: `scale(${zoom / 100})` }}>
          <iframe ref={iframeRef} className="rounded-2xl shadow-2xl border border-white/10 bg-black" style={{ width: iframeSize.width, height: iframeSize.height, minWidth: iframeSize.width, minHeight: iframeSize.height }} sandbox="allow-scripts allow-same-origin" title="preview" />
        </div>
      </div>
      <div className="h-7 flex items-center px-4 deck-glass-thin rounded-none border-x-0 border-b-0 text-[10px] text-deck-text3 shrink-0" style={{ borderRadius: '20px 20px 0 0' }}>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isEditMode ? 'bg-deck-accent animate-pulse' : 'bg-deck-text3'}`} />
          {isEditMode ? '编辑模式' : '预览模式'}
        </span>
        <span className="deck-divider-v mx-2" />
        <span>页面 {currentPageIndex + 1} / {pages.length}</span>
        <span className="deck-divider-v mx-2" />
        <span>{iframeSize.width} x {iframeSize.height}</span>
      </div>
    </div>
  );
}

function prepareIframeContent(content: string, fileTree: { path: string; type: string; content?: string | ArrayBuffer; mimeType?: string }[], currentPath: string, designSize: { width: number; height: number }): string {
  let html = content;
  const resourceMap = new Map<string, string>();
  const baseDir = currentPath.includes('/') ? currentPath.substring(0, currentPath.lastIndexOf('/') + 1) : '';
  for (const node of fileTree) {
    if (node.type === 'file' && node.content && node.path !== currentPath) {
      const mime = node.mimeType || 'application/octet-stream';
      const blob = typeof node.content === 'string' ? new Blob([node.content], { type: mime }) : new Blob([node.content], { type: mime });
      const url = URL.createObjectURL(blob);
      resourceMap.set(node.path, url);
      if (baseDir && node.path.startsWith(baseDir)) { const rel = node.path.substring(baseDir.length); resourceMap.set(rel, url); resourceMap.set('./' + rel, url); }
    }
  }
  html = html.replace(/<link([^>]*)href=["']([^"']+)["']([^>]*)>/gi, (m, b, href, a) => { const r = resolvePath(href, resourceMap, baseDir); return r ? `<link${b}href="${r}"${a}>` : m; });
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)>/gi, (m, b, src, a) => { const r = resolvePath(src, resourceMap, baseDir); return r ? `<script${b}src="${r}"${a}>` : m; });
  html = html.replace(/<img([^>]*)src=["']([^"']+)["']([^>]*)>/gi, (m, b, src, a) => { const r = resolvePath(src, resourceMap, baseDir); return r ? `<img${b}src="${r}"${a}>` : m; });
  html = html.replace(/url\(["']?([^"')]+)["']?\)/gi, (m, p) => { const r = resolvePath(p, resourceMap, baseDir); return r ? `url("${r}")` : m; });
  html = injectIframeNormalization(html, designSize);
  return html;
}

function detectDesignSize(content: string): { width: number; height: number } {
  // 优先识别常见幻灯片尺寸声明
  const patterns = [
    /\.slide\s*\{[^}]*width\s*:\s*(\d+)px[^}]*height\s*:\s*(\d+)px/si,
    /\.slide\s*\{[^}]*height\s*:\s*(\d+)px[^}]*width\s*:\s*(\d+)px/si,
    /\.deck\s*\{[^}]*width\s*:\s*(\d+)px[^}]*height\s*:\s*(\d+)px/si,
    /\.page\s*\{[^}]*width\s*:\s*(\d+)px[^}]*height\s*:\s*(\d+)px/si,
    /width\s*:\s*(\d+)px[\s\S]{0,200}height\s*:\s*(\d+)px/si,
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) {
      const w = parseInt(m[1], 10);
      const h = parseInt(m[2], 10);
      if (w >= 320 && h >= 240 && w <= 7680 && h <= 4320) return { width: w, height: h };
    }
  }
  return { width: DEFAULT_SLIDE_WIDTH, height: DEFAULT_SLIDE_HEIGHT };
}

function injectIframeNormalization(html: string, designSize: { width: number; height: number }): string {
  const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const resetStyle = `<style id="__deckforge-reset">html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}*,*::before,*::after{box-sizing:border-box}#__deckforge-reset{display:none !important}</style>`;
  const designStyle = `<style id="__deckforge-design-size">html{width:${designSize.width}px;height:${designSize.height}px}#__deckforge-design-size{display:none !important}</style>`;
  const injection = resetStyle + designStyle + (hasViewport ? '' : viewport);
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${injection}</head>`);
  }
  if (/<body/i.test(html)) {
    return html.replace(/<body/i, `${injection}<body`);
  }
  return injection + html;
}

function fitZoomToContainer(container: HTMLDivElement | null, contentWidth: number, contentHeight: number, setZoom: (z: number) => void) {
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const paddingX = 32;
  const paddingY = 32;
  const scaleX = (rect.width - paddingX) / contentWidth;
  const scaleY = (rect.height - paddingY) / contentHeight;
  const scale = Math.min(scaleX, scaleY);
  const zoom = Math.max(25, Math.min(100, Math.round(scale * 100)));
  setZoom(zoom);
}

function resolvePath(href: string, resourceMap: Map<string, string>, baseDir: string): string | null {
  if (href.startsWith('http') || href.startsWith('data:') || href.startsWith('blob:')) return null;
  if (resourceMap.has(href)) return resourceMap.get(href)!;
  if (baseDir) { const fp = baseDir + href; if (resourceMap.has(fp)) return resourceMap.get(fp)!; }
  return null;
}

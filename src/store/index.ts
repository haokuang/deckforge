/** Zustand Store — 全局状态管理 */
import { create } from 'zustand';
import type {
  FileNode, PageInfo, SelectedElementInfo,
  ImportState, ToastMessage, AppState,
  ThemeMode,
  AgentBridgeSettings,
  SlideMeta,
} from '../types';
import { buildFileTreeFromFiles, readFileAsText, readFileAsBuffer } from '../utils/zip';
import { supportsFileSystemAccess, downloadBlob } from '../utils/fileAccess';
import { SLIDE_SELECTORS, FORMAT_PAINTER_PROPERTIES } from '../utils/constants';
import { saveDraft, loadDraft, clearDraft } from '../utils/draft';

type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'distribute-h' | 'distribute-v';
type InsertKind = 'textbox' | 'rect' | 'circle' | 'line';

interface AppStore extends AppState {
  importFiles: (files: FileList | File[], handles?: Map<string, FileSystemFileHandle>) => Promise<void>;
  importPickedFiles: () => Promise<void>;
  selectPage: (index: number) => void;
  setEditMode: (mode: boolean) => void;
  selectElement: (info: SelectedElementInfo | null) => void;
  applyStyle: (property: string, value: string) => void;
  applyText: (text: string) => void;
  replaceImage: (imageData: string) => void;
  applyHtml: (html: string) => void;
  undo: () => void;
  redo: () => void;
  setHistoryCounts: (undoCount: number, redoCount: number) => void;
  setSelectionCount: (count: number) => void;
  setZoom: (zoom: number) => void;
  saveToFile: () => Promise<void>;
  closeDocument: () => Promise<void>;
  restoreOriginal: () => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setShowSettings: (show: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setImportState: (state: Partial<ImportState>) => void;
  resetState: () => void;
  setFileTree: (tree: FileNode[]) => void;
  setPages: (pages: PageInfo[]) => void;
  setIframeWindow: (win: Window | null) => void;
  setIframeEl: (el: HTMLIFrameElement | null) => void;

  // 元素级操作（发给 iframe 桥，历史由桥内管理）
  insertElement: (kind: InsertKind) => void;
  deleteSelectedElements: () => void;
  copySelectedElements: () => void;
  pasteElements: () => void;
  duplicateSelectedElements: () => void;
  alignSelection: (mode: AlignMode) => void;

  // 幻灯片级操作
  insertSlideAfter: (index: number) => void;
  duplicateSlide: (index: number) => void;
  deleteSlide: (index: number) => void;
  moveSlide: (from: number, to: number) => void;
  handleSlidesChanged: (slides: SlideMeta[], current: number) => void;

  // 本地草稿
  scheduleAutosave: () => void;
  runAutosave: () => Promise<void>;
  loadDraftInfo: () => Promise<void>;
  restoreDraft: () => Promise<void>;
  discardDraft: () => Promise<void>;

  // 格式刷
  copyFormatPainter: () => void;
  toggleFormatPainter: () => void;
  setFormatPainterSticky: (sticky: boolean) => void;
  applyFormatPainter: (target: SelectedElementInfo) => void;
  clearFormatPainter: () => void;

  // 本地 Codex Agent
  setAgentSettings: (settings: Partial<AgentBridgeSettings>) => void;
  testAgentConnection: () => Promise<string>;
  runAgentOnSlide: (instruction: string) => Promise<void>;
  cancelAgentTask: () => void;
  dismissAgentTaskError: () => void;
  revertLastAgentEdit: () => void;
}

const initialState: AppState = {
  fileTree: [],
  originalFileTree: [],
  currentFile: null,
  pages: [],
  currentPageIndex: -1,
  isEditMode: false,
  selectedElement: null,
  zoom: 100,
  undoCount: 0,
  redoCount: 0,
  selectionCount: 0,
  importState: {
    isImporting: false,
    progress: 0,
    totalFiles: 0,
    processedFiles: 0,
  },
  toasts: [],
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  showSettings: false,
  theme: getInitialTheme(),
  hasImported: false,
  reloadToken: 0,
  iframeWindow: null,
  iframeEl: null,

  agentSettings: {
    serverUrl: 'http://127.0.0.1:8787',
  },
  agentTask: {
    status: 'idle',
    pageIndex: -1,
    instruction: '',
    startedAt: 0,
  },
  lastAgentEdit: null,
  draftInfo: null,

  // 格式刷
  formatPainterSource: null,
  formatPainterActive: false,
  formatPainterSticky: false,
};

/** 当前 Agent 任务的取消控制器（不放入 store，避免状态残留） */
let agentAbortController: AbortController | null = null;
let autosaveTimer: number | null = null;

export const useStore = create<AppStore>((set, get) => ({
  ...initialState,

  importFiles: async (files, handles) => {
    const { addToast, setFileTree, setPages } = get();
    get().cancelAgentTask();
    set({ importState: { ...initialState.importState, isImporting: true, progress: 0 } });

    try {
      let fileTree: FileNode[] = [];
      const fileArray = Array.from(files);
      const htmlFiles = fileArray.filter((f) => f.name.endsWith('.html') || f.name.endsWith('.htm'));

      if (htmlFiles.length > 0) {
        fileTree = buildFileTreeFromFiles(files);
        for (const node of fileTree) {
          if (node.type !== 'file') continue;
          const file = fileArray.find((f) => f.name === node.name);
          if (!file) continue;
          if (node.name.endsWith('.html') || node.name.endsWith('.htm')) {
            node.content = await readFileAsText(file);
            node.fileHandle = handles?.get(node.name);
          } else {
            node.content = await readFileAsBuffer(file);
          }
        }
        addToast('HTML 文件导入成功', 'success');
      } else {
        addToast('请上传 HTML 文件', 'warning');
        set({ importState: { ...initialState.importState, isImporting: false } });
        return;
      }

      set({ fileTree: [...fileTree], originalFileTree: JSON.parse(JSON.stringify(fileTree)) });
      setFileTree(fileTree);

      // 解析页面结构
      const mainHtml = fileTree.find((n) => n.isMainHtml || n.name.endsWith('.html'));
      if (mainHtml && typeof mainHtml.content === 'string') {
        const pages = parsePageStructure(mainHtml.content, mainHtml.path);
        setPages(pages);
      }

      set({
        hasImported: true,
        currentFile: mainHtml?.path || null,
        currentPageIndex: 0,
        undoCount: 0,
        redoCount: 0,
        selectionCount: 0,
        importState: { ...initialState.importState, isImporting: false },
      });
    } catch (err) {
      console.error('Import failed:', err);
      addToast('导入失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      set({ importState: { ...initialState.importState, isImporting: false } });
    }
  },

  importPickedFiles: async () => {
    const { addToast } = get();
    if (!supportsFileSystemAccess()) {
      // 降级：普通文件选择（无法写回原文件，保存时走下载）
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,.htm';
      input.multiple = true;
      input.onchange = () => {
        if (input.files && input.files.length > 0) void get().importFiles(input.files);
      };
      input.click();
      return;
    }
    try {
      const picked = await (window as unknown as {
        showOpenFilePicker: (options: unknown) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        multiple: true,
        types: [
          { description: 'HTML 演示稿', accept: { 'text/html': ['.html', '.htm'] } },
        ],
      });
      const files = await Promise.all(picked.map((h) => h.getFile()));
      const handleMap = new Map<string, FileSystemFileHandle>();
      picked.forEach((h, i) => handleMap.set(files[i].name, h));
      await get().importFiles(files, handleMap);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      addToast('选择文件失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  },

  selectPage: (index) => {
    set({ currentPageIndex: index, selectedElement: null, selectionCount: 0 });
  },

  setEditMode: (mode) => {
    set({ isEditMode: mode });
  },

  selectElement: (info) => {
    set({ selectedElement: info, selectionCount: info?.selectionCount ?? (info ? 1 : 0) });
  },

  applyStyle: (property, value) => {
    const { selectedElement } = get();
    if (!selectedElement) return;
    // 更新本地样式状态
    set((state) => ({
      selectedElement: state.selectedElement ? {
        ...state.selectedElement,
        computedStyles: { ...state.selectedElement.computedStyles, [property]: value }
      } : null
    }));
    // 同步到 iframe（历史快照由桥内 pushHistory 处理）
    const { iframeWindow, selectedElement: sel } = get();
    if (iframeWindow && sel) {
      iframeWindow.postMessage({ type: 'DECKFORGE_APPLY_STYLE', selector: sel.selector, property, value }, '*');
    }
  },

  applyText: (text) => {
    const { selectedElement } = get();
    if (!selectedElement || !selectedElement.isTextEditable) return;
    set((state) => ({
      selectedElement: state.selectedElement ? { ...state.selectedElement, textContent: text } : null,
    }));
    const { iframeWindow, selectedElement: selText } = get();
    if (iframeWindow && selText) {
      iframeWindow.postMessage({ type: 'DECKFORGE_APPLY_TEXT', selector: selText.selector, text }, '*');
    }
  },

  replaceImage: (imageData) => {
    const { selectedElement } = get();
    if (!selectedElement || !selectedElement.isImage) return;
    const { iframeWindow, selectedElement: selImg } = get();
    if (iframeWindow && selImg) {
      iframeWindow.postMessage({ type: 'DECKFORGE_REPLACE_IMAGE', selector: selImg.selector, imageData }, '*');
    }
  },

  applyHtml: (html) => {
    const { selectedElement } = get();
    if (!selectedElement) return;
    const { iframeWindow, selectedElement: sel } = get();
    if (iframeWindow && sel) {
      iframeWindow.postMessage({ type: 'DECKFORGE_REPLACE_HTML', selector: sel.selector, html }, '*');
    }
    // 替换后清除选择，因为 DOM 结构可能已改变
    set({ selectedElement: null });
  },

  undo: () => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_UNDO' }, '*');
  },

  redo: () => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_REDO' }, '*');
  },

  setHistoryCounts: (undoCount, redoCount) => {
    set((state) => (state.undoCount === undoCount && state.redoCount === redoCount ? {} : { undoCount, redoCount }));
    get().scheduleAutosave();
  },

  setSelectionCount: (count) => {
    set((state) => (state.selectionCount === count ? {} : { selectionCount: count }));
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  saveToFile: async () => {
    const { fileTree, currentFile, iframeWindow, addToast } = get();
    if (!currentFile || fileTree.length === 0) {
      addToast('没有可保存的文件', 'warning');
      return;
    }
    if (!iframeWindow) {
      addToast('预览尚未加载完成，请稍后再保存', 'warning');
      return;
    }
    const htmlNode = fileTree.find((n) => n.path === currentFile);
    if (!htmlNode) {
      addToast('找不到文件内容', 'error');
      return;
    }

    const html = await requestIframeHtml(iframeWindow);

    /** 通过句柄写回文件，成功返回 true */
    const writeViaHandle = async (handle: FileSystemFileHandle): Promise<boolean> => {
      const h = handle as FileSystemFileHandle & {
        queryPermission?: (o: { mode: string }) => Promise<PermissionState>;
        requestPermission?: (o: { mode: string }) => Promise<PermissionState>;
        createWritable: () => Promise<FileSystemWritableFileStream>;
      };
      const permission = await h.queryPermission?.({ mode: 'readwrite' });
      if (permission && permission !== 'granted') {
        const requested = await h.requestPermission?.({ mode: 'readwrite' });
        if (requested !== 'granted') throw new Error('未授予文件写入权限');
      }
      const writable = await h.createWritable();
      await writable.write(new Blob([html], { type: 'text/html' }));
      await writable.close();
      return true;
    };

    const commit = (handle?: FileSystemFileHandle) => {
      set((state) => ({
        fileTree: state.fileTree.map((node) => node.path === currentFile ? { ...node, content: html, fileHandle: handle } : node),
      }));
    };

    // 1) 已有文件句柄：直接写回原文件
    if (htmlNode.fileHandle) {
      try {
        await writeViaHandle(htmlNode.fileHandle);
        commit(htmlNode.fileHandle);
        addToast(`已保存到原文件 ${htmlNode.name}`, 'success');
      } catch (err) {
        addToast('保存失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      }
      return;
    }

    // 2) 没有句柄（拖拽导入等）：让用户选择原文件，建立关联后写回
    if (supportsFileSystemAccess()) {
      try {
        const [handle] = await (window as unknown as {
          showOpenFilePicker: (options: unknown) => Promise<FileSystemFileHandle[]>;
        }).showOpenFilePicker({
          multiple: false,
          types: [
            { description: 'HTML 演示稿', accept: { 'text/html': ['.html', '.htm'] } },
          ],
        });
        await writeViaHandle(handle);
        commit(handle);
        addToast(`已保存到原文件 ${handle.name}，下次保存无需再选`, 'success');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          addToast('已取消保存（未写入任何文件）', 'info');
        } else {
          addToast('保存失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
        }
      }
      return;
    }

    // 3) 浏览器不支持文件系统访问（Firefox/Safari）：只能下载
    downloadBlob(new Blob([html], { type: 'text/html' }), htmlNode.name);
    commit();
    addToast(`当前浏览器无法直接写回文件，已下载修改后的 ${htmlNode.name}`, 'info');
  },

  restoreOriginal: () => {
    const { originalFileTree, setFileTree, setPages, addToast } = get();
    const restored = JSON.parse(JSON.stringify(originalFileTree));
    set({
      fileTree: restored,
      undoCount: 0,
      redoCount: 0,
      selectionCount: 0,
      selectedElement: null,
    });
    setFileTree(restored);

    const mainHtml = restored.find((n: FileNode) => n.isMainHtml || n.name.endsWith('.html'));
    if (mainHtml && typeof mainHtml.content === 'string') {
      const pages = parsePageStructure(mainHtml.content, mainHtml.path);
      setPages(pages);
    }
    addToast('已恢复到初始状态', 'success');
  },

  // 关闭当前文档返回主页：先存一次草稿保证不丢编辑，再清空工作区（草稿保留，可从主页恢复）
  closeDocument: async () => {
    get().cancelAgentTask();
    try {
      await get().runAutosave();
    } catch {
      // iframe 不可用时跳过，草稿仍为最近一次自动保存的内容
    }
    set({
      fileTree: [],
      originalFileTree: [],
      currentFile: null,
      pages: [],
      currentPageIndex: -1,
      isEditMode: false,
      selectedElement: null,
      selectionCount: 0,
      undoCount: 0,
      redoCount: 0,
      hasImported: false,
      iframeWindow: null,
      iframeEl: null,
      formatPainterSource: null,
      formatPainterActive: false,
      formatPainterSticky: false,
      importState: { ...initialState.importState },
    });
    get().addToast('已关闭文档，可从主页恢复草稿', 'info');
  },

  addToast: (message, type) => {
    const id = crypto.randomUUID();
    const toast: ToastMessage = { id, message, type, duration: 3000 };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    setTimeout(() => {
      get().removeToast(id);
    }, toast.duration);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  toggleLeftPanel: () => {
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed }));
  },

  toggleRightPanel: () => {
    set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed }));
  },

  setShowSettings: (show) => {
    set({ showSettings: show });
  },

  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('deckforge-theme', theme);
    } catch {
      // 隐私模式禁用本地存储时，主题仍在当前页面内生效。
    }
    set({ theme });
  },

  setImportState: (state) => {
    set((s) => ({ importState: { ...s.importState, ...state } }));
  },

  resetState: () => {
    set({ ...initialState });
  },

  setFileTree: (tree) => {
    // 导入/恢复原状都会走这里，bump reloadToken 让 PreviewArea 重载 iframe
    set((s) => ({ fileTree: tree, reloadToken: s.reloadToken + 1 }));
  },

  setPages: (pages) => {
    set({ pages });
  },

  setIframeWindow: (win) => {
    set({ iframeWindow: win });
  },

  setIframeEl: (el) => {
    set({ iframeEl: el });
  },

  // ---------- 元素级操作 ----------

  insertElement: (kind) => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_INSERT_ELEMENT', kind }, '*');
  },

  deleteSelectedElements: () => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_DELETE_SELECTED' }, '*');
  },

  copySelectedElements: () => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_COPY_SELECTED' }, '*');
  },

  pasteElements: () => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_PASTE_ELEMENT' }, '*');
  },

  duplicateSelectedElements: () => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_DUPLICATE_SELECTED' }, '*');
  },

  alignSelection: (mode) => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_ALIGN', mode }, '*');
  },

  // ---------- 幻灯片级操作 ----------

  insertSlideAfter: (index) => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_INSERT_SLIDE', index }, '*');
  },

  duplicateSlide: (index) => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_DUPLICATE_SLIDE', index }, '*');
  },

  deleteSlide: (index) => {
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_DELETE_SLIDE', index }, '*');
  },

  moveSlide: (from, to) => {
    if (from === to) return;
    const { iframeWindow } = get();
    iframeWindow?.postMessage({ type: 'DECKFORGE_MOVE_SLIDE', from, to }, '*');
  },

  handleSlidesChanged: (slides, current) => {
    const pages: PageInfo[] = slides.map((s) => ({
      id: crypto.randomUUID(),
      index: s.index,
      title: s.title || `页面 ${s.index + 1}`,
      type: (s.type as PageInfo['type']) || 'unknown',
      selector: `bridge:${s.index}`,
    }));
    set((state) => ({
      pages,
      currentPageIndex: Math.min(Math.max(current, 0), Math.max(pages.length - 1, 0)),
    }));
    get().scheduleAutosave();
  },

  // ---------- 本地草稿 ----------

  scheduleAutosave: () => {
    if (autosaveTimer) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      autosaveTimer = null;
      void get().runAutosave();
    }, 1500);
  },

  runAutosave: async () => {
    const { iframeWindow, fileTree, currentFile } = get();
    if (!iframeWindow || !currentFile || fileTree.length === 0) return;
    try {
      const html = await requestIframeHtml(iframeWindow);
      const updated = fileTree.map((n) => n.path === currentFile ? { ...n, content: html } : n);
      set({ fileTree: updated });
      await saveDraft({ fileTree: updated, currentFile, savedAt: Date.now() });
      set({ draftInfo: { savedAt: Date.now() } });
    } catch {
      // 预览未就绪时静默跳过，下一次变更会重试
    }
  },

  loadDraftInfo: async () => {
    try {
      const draft = await loadDraft();
      set({ draftInfo: draft ? { savedAt: draft.savedAt } : null });
    } catch {
      set({ draftInfo: null });
    }
  },

  restoreDraft: async () => {
    const { addToast, setPages } = get();
    get().cancelAgentTask();
    try {
      const draft = await loadDraft();
      if (!draft) {
        addToast('没有可恢复的草稿', 'warning');
        return;
      }
      set({
        fileTree: draft.fileTree,
        originalFileTree: JSON.parse(JSON.stringify(draft.fileTree)),
        currentFile: draft.currentFile,
        currentPageIndex: 0,
        selectedElement: null,
        selectionCount: 0,
        undoCount: 0,
        redoCount: 0,
        hasImported: true,
        reloadToken: get().reloadToken + 1,
        isEditMode: false,
      });
      const mainHtml = draft.fileTree.find((n) => n.isMainHtml || n.name.endsWith('.html'));
      if (mainHtml && typeof mainHtml.content === 'string') {
        setPages(parsePageStructure(mainHtml.content, mainHtml.path));
      }
      addToast('已恢复上次编辑的草稿', 'success');
    } catch (err) {
      addToast('恢复草稿失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  },

  discardDraft: async () => {
    try {
      await clearDraft();
    } catch {
      // 忽略清理失败
    }
    set({ draftInfo: null });
  },

  // ---------- 格式刷 ----------

  copyFormatPainter: () => {
    const { selectedElement, addToast } = get();
    if (!selectedElement) {
      addToast('请先选中一个元素再复制格式', 'warning');
      return;
    }
    set({
      formatPainterSource: { ...selectedElement },
      formatPainterActive: true,
      formatPainterSticky: false,
    });
    addToast('格式已复制，点击目标元素应用', 'success');
  },

  toggleFormatPainter: () => {
    const { formatPainterActive, formatPainterSource, selectedElement, copyFormatPainter, clearFormatPainter } = get();
    if (!formatPainterActive) {
      if (!formatPainterSource && selectedElement) {
        copyFormatPainter();
      } else if (formatPainterSource) {
        set({ formatPainterActive: true });
      }
    } else {
      clearFormatPainter();
    }
  },

  setFormatPainterSticky: (sticky) => {
    set({ formatPainterSticky: sticky });
  },

  applyFormatPainter: (target) => {
    const { formatPainterSource, iframeWindow, addToast, clearFormatPainter, formatPainterSticky } = get();
    if (!formatPainterSource) {
      addToast('没有可复制应用的格式', 'warning');
      return;
    }
    if (!target) {
      addToast('请先选中目标元素', 'warning');
      return;
    }
    if (formatPainterSource.selector === target.selector) {
      addToast('不能将格式应用到源元素自身', 'warning');
      return;
    }

    const stylesToApply: Record<string, string> = {};
    const targetStyles = target.computedStyles;

    for (const property of FORMAT_PAINTER_PROPERTIES) {
      const value = formatPainterSource.computedStyles[property];
      if (value && value !== targetStyles[property]) {
        stylesToApply[property] = value;
      }
    }

    if (Object.keys(stylesToApply).length === 0) {
      addToast('目标元素已具有相同格式', 'info');
      return;
    }

    // 更新本地选中元素的样式状态
    set((state) => ({
      selectedElement: state.selectedElement ? {
        ...state.selectedElement,
        computedStyles: { ...state.selectedElement.computedStyles, ...stylesToApply }
      } : null
    }));

    // 同步到 iframe（历史快照由桥内处理）
    if (iframeWindow) {
      iframeWindow.postMessage({
        type: 'DECKFORGE_APPLY_MULTIPLE_STYLES',
        selector: target.selector,
        styles: stylesToApply,
      }, '*');
    }

    addToast(`已应用 ${Object.keys(stylesToApply).length} 项格式`, 'success');

    if (!formatPainterSticky) {
      clearFormatPainter();
    }
  },

  clearFormatPainter: () => {
    set({
      formatPainterSource: null,
      formatPainterActive: false,
      formatPainterSticky: false,
    });
  },

  // ---------- 本地 Codex Agent ----------

  setAgentSettings: (settings) => {
    set((state) => ({ agentSettings: { ...state.agentSettings, ...settings } }));
  },

  testAgentConnection: async () => {
    const { agentSettings } = get();
    const base = agentSettings.serverUrl.replace(/\/+$/, '');
    const response = await fetch(`${base}/api/health`, { method: 'GET' });
    if (!response.ok) throw new Error(`桥接服务返回 ${response.status}`);
    const data = (await response.json().catch(() => null)) as { ok?: boolean; codex?: string | null } | null;
    if (!data?.ok) throw new Error('桥接服务响应异常');
    return data.codex ? `桥接服务在线，Codex ${data.codex}` : '桥接服务在线，但未检测到 codex 命令';
  },

  runAgentOnSlide: async (instruction) => {
    const { addToast, iframeWindow, currentPageIndex, pages, agentTask, agentSettings, selectedElement } = get();
    const trimmed = instruction.trim();
    if (agentTask.status === 'running') {
      addToast('已有 Agent 任务在运行，请先等待完成或取消', 'warning');
      return;
    }
    if (!trimmed) {
      addToast('请先输入编辑指令', 'warning');
      return;
    }
    if (!iframeWindow) {
      addToast('预览尚未加载完成，请稍后再试', 'warning');
      return;
    }

    const pageIndex = currentPageIndex;
    const page = pages[pageIndex];
    const taskId = Date.now();

    // 单写者原则：先锁定当前页，锁定后该页不再响应人为编辑事件，
    // 然后导出的基线快照在任务期间保持稳定。
    set({ agentTask: { status: 'running', pageIndex, instruction: trimmed, startedAt: taskId } });
    iframeWindow.postMessage({ type: 'DECKFORGE_SET_SLIDE_LOCK', index: pageIndex, locked: true }, '*');

    try {
      const exported = await requestIframeSlideHtml(iframeWindow, pageIndex);
      if (!exported.html.trim()) {
        throw new Error('未能读取当前页内容，请重新导入后重试');
      }

      const base = agentSettings.serverUrl.replace(/\/+$/, '');
      agentAbortController = new AbortController();
      // baseline 存去掉选中标记的干净版本，撤销恢复时不会把标记带进文档
      const baselineHtml = exported.html.replace(/\s+data-deckforge-selected="[^"]*"/g, '').trim();
      const response = await fetch(`${base}/api/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: trimmed,
          slideHtml: exported.html,
          context: {
            width: exported.width || undefined,
            height: exported.height || undefined,
            pageLabel: `第 ${pageIndex + 1} 页 / 共 ${pages.length} 页`,
            pageTitle: page?.title,
            selection: exported.selected || undefined,
          },
        }),
        signal: agentAbortController.signal,
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; html?: string; error?: string } | null;
      if (!response.ok || !data?.ok || typeof data.html !== 'string' || !data.html.trim()) {
        throw new Error(data?.error || `桥接服务返回 ${response.status}`);
      }

      const { iframeWindow: currentWindow } = get();
      if (!currentWindow) throw new Error('预览已关闭，修改未应用');
      currentWindow.postMessage({ type: 'DECKFORGE_REPLACE_SLIDE', index: pageIndex, html: data.html }, '*');
      set({
        selectedElement: selectedElement && get().currentPageIndex === pageIndex ? null : get().selectedElement,
        lastAgentEdit: {
          pageIndex,
          pageTitle: page?.title || `第 ${pageIndex + 1} 页`,
          instruction: trimmed,
          baselineHtml,
          timestamp: Date.now(),
        },
      });
      addToast(`AI 已修改第 ${pageIndex + 1} 页，可随时撤销`, 'success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        addToast('已取消 AI 任务', 'info');
      } else {
        const message = err instanceof Error ? err.message : '未知错误';
        set((state) => ({
          agentTask: { ...state.agentTask, status: 'idle', error: message },
        }));
        addToast('AI 任务失败: ' + message, 'error');
      }
    } finally {
      agentAbortController = null;
      const { iframeWindow: windowAfter } = get();
      windowAfter?.postMessage({ type: 'DECKFORGE_SET_SLIDE_LOCK', index: pageIndex, locked: false }, '*');
      set((state) => (state.agentTask.startedAt === taskId
        ? { agentTask: { status: 'idle', pageIndex: -1, instruction: '', startedAt: 0 } }
        : {}));
    }
  },

  cancelAgentTask: () => {
    agentAbortController?.abort();
    agentAbortController = null;
  },

  dismissAgentTaskError: () => {
    set((state) => ({ agentTask: { ...state.agentTask, error: undefined } }));
  },

  revertLastAgentEdit: () => {
    const { lastAgentEdit, iframeWindow, addToast } = get();
    if (!lastAgentEdit) return;
    if (!iframeWindow) {
      addToast('预览尚未加载，无法撤销', 'warning');
      return;
    }
    iframeWindow.postMessage({
      type: 'DECKFORGE_REPLACE_SLIDE',
      index: lastAgentEdit.pageIndex,
      html: lastAgentEdit.baselineHtml,
    }, '*');
    set({ lastAgentEdit: null, selectedElement: null });
    addToast(`已恢复第 ${lastAgentEdit.pageIndex + 1} 页到 AI 修改前`, 'success');
  },
}));

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    return localStorage.getItem('deckforge-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** 从预览 iframe 获取已经应用全部编辑的、可持久化 HTML。 */
function requestIframeHtml(iframeWindow: Window): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('读取当前编辑内容超时'));
    }, 5000);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeWindow) return;
      if (event.data?.type !== 'DECKFORGE_HTML_RESPONSE' || event.data.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      if (typeof event.data.html !== 'string') {
        reject(new Error('预览未返回有效 HTML'));
        return;
      }
      resolve(event.data.html);
    };

    window.addEventListener('message', handleMessage);
    iframeWindow.postMessage({ type: 'DECKFORGE_REQUEST_HTML', requestId }, '*');
  });
}

/** 从预览 iframe 读取指定页的内部 HTML 与画布尺寸（供 Agent 使用）。 */
function requestIframeSlideHtml(
  iframeWindow: Window,
  index: number,
): Promise<{ html: string; width: number; height: number; selected: { tag: string; text: string } | null }> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      reject(new Error('读取当前页内容超时'));
    }, 5000);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeWindow) return;
      if (event.data?.type !== 'DECKFORGE_SLIDE_EXPORT' || event.data.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      resolve({
        html: typeof event.data.html === 'string' ? event.data.html : '',
        width: Number(event.data.width) || 0,
        height: Number(event.data.height) || 0,
        selected: event.data.selected ?? null,
      });
    };

    window.addEventListener('message', handleMessage);
    iframeWindow.postMessage({ type: 'DECKFORGE_EXPORT_SLIDE', index, requestId }, '*');
  });
}

/**
 * 解析 HTML 页面结构，识别 slides
 */
function parsePageStructure(html: string, filePath: string): PageInfo[] {
  const pages: PageInfo[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    for (const selector of SLIDE_SELECTORS) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((el, idx) => {
          const title = extractTitle(el as HTMLElement) || `页面 ${idx + 1}`;
          const type = detectPageType(el as HTMLElement);
          pages.push({
            id: crypto.randomUUID(),
            index: idx,
            title,
            type,
            selector: `${selector}:nth-child(${idx + 1})`,
          });
        });
        break; // 使用第一个匹配到的选择器
      }
    }

    // 如果没有识别到 slides，把整个 body 当作一个页面
    if (pages.length === 0) {
      const body = doc.body;
      pages.push({
        id: crypto.randomUUID(),
        index: 0,
        title: extractTitle(body) || filePath,
        type: 'unknown',
        selector: 'body',
      });
    }
  } catch (err) {
    console.error('Parse page structure failed:', err);
  }
  return pages;
}

function extractTitle(el: HTMLElement): string | undefined {
  const heading = el.querySelector('h1, h2, h3, .title, [data-title]');
  if (heading) return heading.textContent?.trim() || undefined;
  const firstText = el.textContent?.trim();
  if (firstText) return firstText.slice(0, 30) + (firstText.length > 30 ? '...' : '');
  return undefined;
}

function detectPageType(el: Element): PageInfo['type'] {
  const className = el.className?.toLowerCase?.() || '';
  const tagName = el.tagName?.toLowerCase?.() || '';
  if (className.includes('cover') || className.includes('title')) return 'cover';
  if (className.includes('chapter')) return 'chapter';
  if (className.includes('transition')) return 'transition';
  if (className.includes('data') || className.includes('chart')) return 'data';
  if (tagName === 'section' || className.includes('slide') || className.includes('page')) return 'slide';
  return 'unknown';
}

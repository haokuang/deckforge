/** Zustand Store — 全局状态管理 */
import { create } from 'zustand';
import type {
  FileNode, PageInfo, EditAction, SelectedElementInfo,
  AIAdapterSettings, ImportState, ToastMessage, AppState,
  RepositoryHtmlFile,
} from '../types';
import { parseZip, buildFileTreeFromFiles, readFileAsText, readFileAsBuffer, createZip } from '../utils/zip';
import { supportsFileSystemAccess, pickDirectory, readDirectoryRecursively, downloadBlob } from '../utils/fileAccess';
import { inlineResources } from '../utils/dom';
import { SLIDE_SELECTORS, FORMAT_PAINTER_PROPERTIES } from '../utils/constants';
import {
  connectGitHubRepository,
  listRepositoryHtmlFiles,
  loadRepositoryHtml,
  saveRepositoryHtml,
  type RepositoryConnectionInput,
} from '../utils/github';

interface AppStore extends AppState {
  importFiles: (files: FileList) => Promise<void>;
  importDirectory: () => Promise<void>;
  selectPage: (index: number) => void;
  setEditMode: (mode: boolean) => void;
  selectElement: (info: SelectedElementInfo | null) => void;
  applyStyle: (property: string, value: string) => void;
  applyText: (text: string) => void;
  replaceImage: (imageData: string) => void;
  applyHtml: (html: string) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  saveToFile: () => Promise<void>;
  exportZip: () => Promise<void>;
  exportSingleHtml: () => Promise<void>;
  restoreOriginal: () => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setAISettings: (settings: Partial<AIAdapterSettings>) => void;
  setShowSettings: (show: boolean) => void;
  setShowRepositoryModal: (show: boolean) => void;
  connectRepository: (input: RepositoryConnectionInput) => Promise<boolean>;
  refreshRepositoryFiles: () => Promise<void>;
  openRepositoryFile: (file: RepositoryHtmlFile) => Promise<boolean>;
  disconnectRepository: () => void;
  setImportState: (state: Partial<ImportState>) => void;
  resetState: () => void;
  setFileTree: (tree: FileNode[]) => void;
  setPages: (pages: PageInfo[]) => void;
  setIframeWindow: (win: Window | null) => void;
  copyFormatPainter: () => void;
  toggleFormatPainter: () => void;
  setFormatPainterSticky: (sticky: boolean) => void;
  applyFormatPainter: (target: SelectedElementInfo) => void;
  clearFormatPainter: () => void;
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
  undoStack: [],
  redoStack: [],
  importState: {
    isImporting: false,
    progress: 0,
    totalFiles: 0,
    processedFiles: 0,
  },
  aiSettings: {
    provider: 'openai',
    apiKey: '',
    enabled: false,
  },
  toasts: [],
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  showSettings: false,
  repository: {
    binding: null,
    files: [],
    currentFile: null,
    isLoading: false,
  },
  showRepositoryModal: false,
  hasImported: false,
  iframeWindow: null,

  // 格式刷
  formatPainterSource: null,
  formatPainterActive: false,
  formatPainterSticky: false,
};

export const useStore = create<AppStore>((set, get) => ({
  ...initialState,

  importFiles: async (files) => {
    const { addToast, setFileTree, setPages } = get();
    set({ importState: { ...initialState.importState, isImporting: true, progress: 0 } });

    try {
      let fileTree: FileNode[] = [];
      const fileArray = Array.from(files);
      const zipFile = fileArray.find((f) => f.name.endsWith('.zip'));
      const htmlFiles = fileArray.filter((f) => f.name.endsWith('.html') || f.name.endsWith('.htm'));

      if (zipFile) {
        fileTree = await parseZip(zipFile);
        addToast('ZIP 文件解析成功', 'success');
      } else if (htmlFiles.length > 0) {
        fileTree = buildFileTreeFromFiles(files);
        for (const node of fileTree) {
          if (node.type !== 'file') continue;
          const file = fileArray.find((f) => f.name === node.name);
          if (!file) continue;
          if (node.name.endsWith('.html') || node.name.endsWith('.htm')) {
            node.content = await readFileAsText(file);
          } else {
            node.content = await readFileAsBuffer(file);
          }
        }
        addToast('HTML 文件导入成功', 'success');
      } else {
        addToast('请上传 HTML 文件或 ZIP 文件', 'warning');
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

      set((state) => ({
        hasImported: true,
        currentFile: mainHtml?.path || null,
        currentPageIndex: 0,
        importState: { ...initialState.importState, isImporting: false },
        repository: { ...state.repository, currentFile: null, lastCommitUrl: undefined },
      }));
    } catch (err) {
      console.error('Import failed:', err);
      addToast('导入失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      set({ importState: { ...initialState.importState, isImporting: false } });
    }
  },

  importDirectory: async () => {
    const { addToast, setFileTree, setPages } = get();
    try {
      if (!supportsFileSystemAccess()) {
        addToast('您的浏览器不支持文件夹选择，请使用 Chrome 或 Edge', 'warning');
        return;
      }
      const dirHandle = await pickDirectory();
      set({ importState: { ...initialState.importState, isImporting: true, progress: 0 } });
      const fileTree = await readDirectoryRecursively(dirHandle);
      set({ fileTree: [...fileTree], originalFileTree: JSON.parse(JSON.stringify(fileTree)) });
      setFileTree(fileTree);

      const mainHtml = fileTree.find((n) => n.isMainHtml || n.name.endsWith('.html'));
      if (mainHtml && mainHtml.content) {
        const content = typeof mainHtml.content === 'string'
          ? mainHtml.content
          : new TextDecoder().decode(mainHtml.content);
        const pages = parsePageStructure(content, mainHtml.path);
        setPages(pages);
      }

      set((state) => ({
        hasImported: true,
        currentFile: mainHtml?.path || null,
        currentPageIndex: 0,
        importState: { ...initialState.importState, isImporting: false },
        repository: { ...state.repository, currentFile: null, lastCommitUrl: undefined },
      }));
      addToast('文件夹导入成功', 'success');
    } catch (err) {
      console.error('Directory import failed:', err);
      addToast('文件夹导入失败', 'error');
      set({ importState: { ...initialState.importState, isImporting: false } });
    }
  },

  selectPage: (index) => {
    set({ currentPageIndex: index, selectedElement: null });
  },

  setEditMode: (mode) => {
    set({ isEditMode: mode });
  },

  selectElement: (info) => {
    set({ selectedElement: info });
  },

  applyStyle: (property, value) => {
    const { selectedElement, undoStack } = get();
    if (!selectedElement) return;
    const action: EditAction = {
      id: crypto.randomUUID(),
      type: 'style',
      target: selectedElement.selector,
      property,
      oldValue: selectedElement.computedStyles[property] || null,
      newValue: value,
      timestamp: Date.now(),
    };
    set({ undoStack: [...undoStack, action], redoStack: [] });
    // 更新本地样式状态
    set((state) => ({
      selectedElement: state.selectedElement ? {
        ...state.selectedElement,
        computedStyles: { ...state.selectedElement.computedStyles, [property]: value }
      } : null
    }));
    // 同步到 iframe
    const { iframeWindow, selectedElement: sel } = get();
    if (iframeWindow && sel) {
      iframeWindow.postMessage({ type: 'DECKFORGE_APPLY_STYLE', selector: sel.selector, property, value }, '*');
    }
  },

  applyText: (text) => {
    const { selectedElement, undoStack } = get();
    if (!selectedElement || !selectedElement.isTextEditable) return;
    const action: EditAction = {
      id: crypto.randomUUID(),
      type: 'text',
      target: selectedElement.selector,
      oldValue: selectedElement.textContent || null,
      newValue: text,
      timestamp: Date.now(),
    };
    set({ undoStack: [...undoStack, action], redoStack: [] });
    // 同步到 iframe
    const { iframeWindow, selectedElement: selText } = get();
    if (iframeWindow && selText) {
      iframeWindow.postMessage({ type: 'DECKFORGE_APPLY_TEXT', selector: selText.selector, text }, '*');
    }
  },

  replaceImage: (imageData) => {
    const { selectedElement, undoStack } = get();
    if (!selectedElement || !selectedElement.isImage) return;
    const action: EditAction = {
      id: crypto.randomUUID(),
      type: 'replace',
      target: selectedElement.selector,
      oldValue: null,
      newValue: imageData,
      timestamp: Date.now(),
    };
    set({ undoStack: [...undoStack, action], redoStack: [] });
    // 同步到 iframe
    const { iframeWindow, selectedElement: selImg } = get();
    if (iframeWindow && selImg) {
      iframeWindow.postMessage({ type: 'DECKFORGE_REPLACE_IMAGE', selector: selImg.selector, imageData }, '*');
    }
  },

  applyHtml: (html) => {
    const { selectedElement, undoStack } = get();
    if (!selectedElement) return;
    const action: EditAction = {
      id: crypto.randomUUID(),
      type: 'replace',
      target: selectedElement.selector,
      oldValue: selectedElement.textContent || null,
      newValue: html,
      timestamp: Date.now(),
    };
    set({ undoStack: [...undoStack, action], redoStack: [] });
    // 同步到 iframe
    const { iframeWindow, selectedElement: sel } = get();
    if (iframeWindow && sel) {
      iframeWindow.postMessage({ type: 'DECKFORGE_REPLACE_HTML', selector: sel.selector, html }, '*');
    }
    // 替换后清除选择，因为 DOM 结构可能已改变
    set({ selectedElement: null });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, action],
    });
    // 同步到 iframe
    const { iframeWindow: ifUndo, selectedElement: selUndo } = get();
    if (ifUndo && selUndo && action.property) {
      ifUndo.postMessage({ type: 'DECKFORGE_APPLY_STYLE', selector: selUndo.selector, property: action.property, value: action.oldValue || '' }, '*');
    }
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    set({
      undoStack: [...undoStack, action],
      redoStack: redoStack.slice(0, -1),
    });
    // 同步到 iframe
    const { iframeWindow: ifRedo, selectedElement: selRedo } = get();
    if (ifRedo && selRedo && action.property) {
      ifRedo.postMessage({ type: 'DECKFORGE_APPLY_STYLE', selector: selRedo.selector, property: action.property, value: action.newValue || '' }, '*');
    }
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  saveToFile: async () => {
    const { fileTree, currentFile, iframeWindow, repository, addToast } = get();
    if (!currentFile || fileTree.length === 0) {
      addToast('没有可保存的文件', 'warning');
      return;
    }
    if (!repository.binding || !repository.currentFile) {
      set({ showRepositoryModal: true });
      addToast('请先从已绑定的 GitHub 仓库打开 PPT，再提交保存', 'warning');
      return;
    }
    if (!iframeWindow) {
      addToast('预览尚未加载完成，请稍后再保存', 'warning');
      return;
    }
    try {
      set((state) => ({ repository: { ...state.repository, isLoading: true } }));
      const htmlNode = fileTree.find((n) => n.path === currentFile);
      if (!htmlNode) {
        addToast('找不到文件内容', 'error');
        return;
      }
      const html = await requestIframeHtml(iframeWindow);
      const saved = await saveRepositoryHtml(repository.binding, repository.currentFile, html);
      const updatedFile = { ...repository.currentFile, sha: saved.fileSha, size: new Blob([html]).size };
      set((state) => ({
        fileTree: state.fileTree.map((node) => node.path === currentFile ? { ...node, content: html } : node),
        repository: {
          ...state.repository,
          currentFile: updatedFile,
          files: state.repository.files.map((file) => file.path === updatedFile.path ? updatedFile : file),
          isLoading: false,
          lastCommitUrl: saved.commitUrl,
        },
      }));
      addToast(`已保存原文件并提交 ${saved.commitSha.slice(0, 7)}`, 'success');
    } catch (err) {
      addToast('保存失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    } finally {
      set((state) => ({ repository: { ...state.repository, isLoading: false } }));
    }
  },

  exportZip: async () => {
    const { fileTree, addToast } = get();
    if (fileTree.length === 0) {
      addToast('没有可导出的文件', 'warning');
      return;
    }
    try {
      addToast('正在打包 ZIP...', 'info');
      const blob = await createZip(fileTree);
      downloadBlob(blob, 'deckforge-export.zip');
      addToast('ZIP 导出成功', 'success');
    } catch {
      addToast('ZIP 导出失败', 'error');
    }
  },

  exportSingleHtml: async () => {
    const { fileTree, currentFile, addToast } = get();
    if (!currentFile || fileTree.length === 0) {
      addToast('没有可导出的文件', 'warning');
      return;
    }
    try {
      const htmlNode = fileTree.find((n) => n.path === currentFile);
      if (!htmlNode || !htmlNode.content) {
        addToast('找不到文件内容', 'error');
        return;
      }
      const content = typeof htmlNode.content === 'string'
        ? htmlNode.content
        : new TextDecoder().decode(htmlNode.content);
      const inlined = inlineResources(content, fileTree);
      const blob = new Blob([inlined], { type: 'text/html' });
      downloadBlob(blob, 'deckforge-export.html');
      addToast('单 HTML 导出成功', 'success');
    } catch {
      addToast('导出失败', 'error');
    }
  },

  restoreOriginal: () => {
    const { originalFileTree, setFileTree, setPages, addToast } = get();
    const restored = JSON.parse(JSON.stringify(originalFileTree));
    set({
      fileTree: restored,
      undoStack: [],
      redoStack: [],
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

  setAISettings: (settings) => {
    set((state) => ({
      aiSettings: { ...state.aiSettings, ...settings },
    }));
  },

  setShowSettings: (show) => {
    set({ showSettings: show });
  },

  setShowRepositoryModal: (show) => {
    set({ showRepositoryModal: show });
  },

  connectRepository: async (input) => {
    const { addToast } = get();
    set((state) => ({ repository: { ...state.repository, isLoading: true } }));
    try {
      const connected = await connectGitHubRepository(input);
      set({
        repository: {
          binding: connected.binding,
          files: connected.files,
          currentFile: null,
          isLoading: false,
        },
      });
      addToast(`已连接 ${connected.binding.owner}/${connected.binding.repo}`, 'success');
      return true;
    } catch (err) {
      addToast('仓库连接失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      return false;
    } finally {
      set((state) => ({ repository: { ...state.repository, isLoading: false } }));
    }
  },

  refreshRepositoryFiles: async () => {
    const { repository, addToast } = get();
    if (!repository.binding) return;
    set((state) => ({ repository: { ...state.repository, isLoading: true } }));
    try {
      const files = await listRepositoryHtmlFiles(repository.binding);
      set((state) => ({ repository: { ...state.repository, files } }));
      addToast(`已刷新，共 ${files.length} 个 HTML`, 'success');
    } catch (err) {
      addToast('刷新失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    } finally {
      set((state) => ({ repository: { ...state.repository, isLoading: false } }));
    }
  },

  openRepositoryFile: async (file) => {
    const { repository, addToast } = get();
    if (!repository.binding) {
      addToast('请先绑定 GitHub 仓库', 'warning');
      return false;
    }
    set((state) => ({ repository: { ...state.repository, isLoading: true } }));
    try {
      const loaded = await loadRepositoryHtml(repository.binding, file);
      const node: FileNode = {
        id: crypto.randomUUID(),
        name: loaded.file.name,
        path: loaded.file.path,
        type: 'file',
        content: loaded.content,
        mimeType: 'text/html',
        isMainHtml: true,
      };
      const fileTree = [node];
      set({
        fileTree,
        originalFileTree: JSON.parse(JSON.stringify(fileTree)),
        currentFile: node.path,
        pages: parsePageStructure(loaded.content, node.path),
        currentPageIndex: 0,
        selectedElement: null,
        undoStack: [],
        redoStack: [],
        hasImported: true,
        isEditMode: false,
        showRepositoryModal: false,
        repository: {
          ...repository,
          currentFile: loaded.file,
          isLoading: false,
          lastCommitUrl: undefined,
        },
      });
      addToast(`已从仓库打开 ${loaded.file.name}`, 'success');
      return true;
    } catch (err) {
      addToast('打开失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
      return false;
    } finally {
      set((state) => ({ repository: { ...state.repository, isLoading: false } }));
    }
  },

  disconnectRepository: () => {
    set((state) => ({
      repository: {
        binding: null,
        files: [],
        currentFile: null,
        isLoading: false,
      },
      // 已打开的 PPT 保留为临时草稿，但不能再提交到已断开的仓库。
      showRepositoryModal: state.showRepositoryModal,
    }));
    get().addToast('已断开 GitHub 仓库', 'info');
  },

  setImportState: (state) => {
    set((s) => ({ importState: { ...s.importState, ...state } }));
  },

  resetState: () => {
    set({ ...initialState });
  },

  setFileTree: (tree) => {
    set({ fileTree: tree });
  },

  setPages: (pages) => {
    set({ pages });
  },

  setIframeWindow: (win) => {
    set({ iframeWindow: win });
  },

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
    const { formatPainterSource, iframeWindow, undoStack, addToast, clearFormatPainter, formatPainterSticky } = get();
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
    const newActions: EditAction[] = [];

    for (const property of FORMAT_PAINTER_PROPERTIES) {
      const value = formatPainterSource.computedStyles[property];
      if (value && value !== targetStyles[property]) {
        stylesToApply[property] = value;
        newActions.push({
          id: crypto.randomUUID(),
          type: 'style',
          target: target.selector,
          property,
          oldValue: targetStyles[property] || null,
          newValue: value,
          timestamp: Date.now(),
        });
      }
    }

    if (Object.keys(stylesToApply).length === 0) {
      addToast('目标元素已具有相同格式', 'info');
      return;
    }

    set({ undoStack: [...undoStack, ...newActions], redoStack: [] });

    // 更新本地选中元素的样式状态
    set((state) => ({
      selectedElement: state.selectedElement ? {
        ...state.selectedElement,
        computedStyles: { ...state.selectedElement.computedStyles, ...stylesToApply }
      } : null
    }));

    // 同步到 iframe
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
}));

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

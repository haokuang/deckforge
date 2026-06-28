/** DeckForge 全局类型定义 */

/** 文件树节点 */
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string | ArrayBuffer;
  mimeType?: string;
  children?: FileNode[];
  isMainHtml?: boolean;
}

/** 页面信息 */
export interface PageInfo {
  id: string;
  index: number;
  title: string;
  type: 'slide' | 'chapter' | 'cover' | 'transition' | 'data' | 'unknown';
  selector: string;
  thumbnail?: string;
  element?: HTMLElement;
}

/** 编辑动作（用于撤销重做） */
export interface EditAction {
  id: string;
  type: 'style' | 'text' | 'replace' | 'delete' | 'add';
  target: string; // CSS selector
  property?: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: number;
}

/** 选中元素信息 */
export interface SelectedElementInfo {
  tagName: string;
  selector: string;
  textContent?: string;
  isTextEditable: boolean;
  isImage: boolean;
  computedStyles: ComputedStyleMap;
  rect: DOMRect;
}

/** 计算样式映射 */
export interface ComputedStyleMap {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  color?: string;
  textAlign?: string;
  backgroundColor?: string;
  borderRadius?: string;
  width?: string;
  height?: string;
  display?: string;
  position?: string;
  zIndex?: string;
  padding?: string;
  margin?: string;
  [key: string]: string | undefined;
}

/** AI 适配设置 */
export interface AIAdapterSettings {
  provider: 'openai' | 'claude' | 'qianwen' | 'kimi' | 'custom';
  apiKey: string;
  apiUrl?: string;
  model?: string;
  enabled: boolean;
}

/** 导入状态 */
export interface ImportState {
  isImporting: boolean;
  progress: number;
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  error?: string;
}

/** Toast 消息 */
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

/** 编辑器状态 */
export interface EditorState {
  isEditMode: boolean;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

/** 应用整体状态 */
export interface AppState {
  // 文件系统
  fileTree: FileNode[];
  originalFileTree: FileNode[];
  currentFile: string | null;
  
  // 页面
  pages: PageInfo[];
  currentPageIndex: number;
  
  // 编辑
  isEditMode: boolean;
  selectedElement: SelectedElementInfo | null;
  zoom: number;
  undoStack: EditAction[];
  redoStack: EditAction[];
  
  // 导入
  importState: ImportState;
  
  // 设置
  aiSettings: AIAdapterSettings;
  
  // UI
  toasts: ToastMessage[];
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  showSettings: boolean;
  
  // 是否已导入文件
  hasImported: boolean;
  
  // iframe 引用
  iframeWindow: Window | null;

  // 格式刷
  formatPainterSource: SelectedElementInfo | null;
  formatPainterActive: boolean;
  formatPainterSticky: boolean;
}

/** 字体选项 */
export interface FontOption {
  value: string;
  label: string;
  category: 'sans' | 'serif' | 'mono' | 'display';
}

/** 颜色预设 */
export interface ColorPreset {
  name: string;
  value: string;
}

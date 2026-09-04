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
  /** 通过 File System Access API 导入时可写回原文件的句柄 */
  fileHandle?: FileSystemFileHandle;
}

/** 页面信息 */
export interface PageInfo {
  id: string;
  index: number;
  title: string;
  type: 'slide' | 'chapter' | 'cover' | 'transition' | 'data' | 'unknown';
  selector: string;
  element?: HTMLElement;
}

/** 编辑动作（用于撤销重做）——历史现由 iframe 桥内快照管理，保留类型供序列化使用 */
export interface EditAction {
  id: string;
  type: 'style' | 'text' | 'replace' | 'delete' | 'add';
  target: string; // CSS selector
  property?: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: number;
}

/** 桥内幻灯片元数据（DECKFORGE_SLIDES_CHANGED 消息） */
export interface SlideMeta {
  index: number;
  title?: string;
  type: string;
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
  selectionCount?: number;
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

/** 本地 Codex Agent 桥接设置 */
export interface AgentBridgeSettings {
  /** 本地 agent-bridge 服务地址，例如 http://127.0.0.1:8787 */
  serverUrl: string;
}

/** Agent 任务状态。running 期间对应页面处于锁定状态。 */
export interface AgentTaskState {
  status: 'idle' | 'running';
  pageIndex: number;
  instruction: string;
  startedAt: number;
  /** 上一次失败的错误信息，供面板展示 */
  error?: string;
}

/** 最近一次 Agent 修改记录，用于一键撤销 */
export interface AgentEditRecord {
  pageIndex: number;
  pageTitle: string;
  instruction: string;
  baselineHtml: string;
  timestamp: number;
}

export type ThemeMode = 'dark' | 'light';

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

/** 本地草稿元信息（IndexedDB 自动保存） */
export interface DraftInfo {
  savedAt: number;
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
  /** 撤销/重做可用步数（由 iframe 桥内快照历史回传） */
  undoCount: number;
  redoCount: number;
  /** 当前多选元素数量（含主选中） */
  selectionCount: number;

  // 导入
  importState: ImportState;

  // UI
  toasts: ToastMessage[];
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  showSettings: boolean;
  theme: ThemeMode;

  // 本地 Codex Agent
  agentSettings: AgentBridgeSettings;
  agentTask: AgentTaskState;
  lastAgentEdit: AgentEditRecord | null;

  // 本地草稿
  draftInfo: DraftInfo | null;

  // 是否已导入文件
  hasImported: boolean;

  // 仅在需要整页重载 iframe 时递增（导入/恢复原状/仓库打开/恢复草稿）；
  // 自动保存只更新 fileTree 内容，不应触发重载，否则会形成 重载→自动保存→重载 死循环
  reloadToken: number;

  // iframe 引用
  iframeWindow: Window | null;
  iframeEl: HTMLIFrameElement | null;

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
  /** 实际应用的完整字体栈（跨平台回退），缺省时用 value */
  stack?: string;
}

/** 颜色预设 */
export interface ColorPreset {
  name: string;
  value: string;
}

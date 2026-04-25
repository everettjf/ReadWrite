export type TabKind = 'web' | 'github' | 'pdf' | 'epub' | 'code';

export interface TabBase {
  id: string;
  kind: TabKind;
  title: string;
  createdAt: number;
}

export interface WebTab extends TabBase {
  kind: 'web' | 'github';
  url: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  loading?: boolean;
}

export interface PdfTab extends TabBase {
  kind: 'pdf';
  path: string;
  page?: number;
}

export interface EpubTab extends TabBase {
  kind: 'epub';
  path: string;
  location?: string;
}

export interface CodeTab extends TabBase {
  kind: 'code';
  rootPath: string;
  activeFile?: string;
}

export type Tab = WebTab | PdfTab | EpubTab | CodeTab;

export interface TabBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  tabId: string;
  /** Path of the markdown file currently being edited; needed when imagesDirMode === 'next-to-doc'. */
  markdownPath?: string | null;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface ScreenshotResult {
  dataUrl: string;
  /** Absolute disk path where the PNG was saved, if any. */
  savedPath?: string;
  /** Path relative to the current markdown file (when next-to-doc mode resolves). */
  relativePath?: string;
  width: number;
  height: number;
}

export interface MarkdownDocument {
  path?: string;
  content: string;
  dirty: boolean;
  frontmatter?: Record<string, unknown>;
}

export type ImagesDirMode = 'next-to-doc' | 'custom' | 'pictures';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  editorMode: 'wysiwyg' | 'source';
  fontSize: number;
  splitRatio: number;

  // Editor
  editorFontSize: number;
  editorFontFamily: 'sans' | 'serif' | 'mono';
  editorMaxWidth: number;

  // Images / screenshots
  imagesDirMode: ImagesDirMode;
  imagesDirCustom?: string;
  imagesDirSubfolderName: string;

  // AI
  aiEnabled: boolean;
  aiEndpoint: string;
  aiApiKey: string;
  aiModel: string;
  aiSystemPrompt: string;

  // WeChat 公众号
  wechatAppId?: string;
  wechatAppSecret?: string;
  /** Theme id used by the "Copy to WeChat" export pipeline. */
  wechatExportTheme: string;

  // Workspace
  /** Folder under which each document gets its own subfolder. */
  workspaceRoot?: string;
  /** Autosave debounce in ms (0 to disable). */
  autosaveDebounceMs: number;
}

export interface FileTreeEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeEntry[];
}

export interface AICompletionRequest {
  /** The text the user wants the LLM to act on. */
  input: string;
  /** Optional task specifier; when omitted the configured systemPrompt is used as-is. */
  instruction?: string;
}

export interface AICompletionResult {
  text: string;
  model: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface ImageSaveOptions {
  /** Path of the markdown file currently being edited (for next-to-doc resolution). */
  markdownPath?: string | null;
  /** Image content, base64-encoded. */
  base64: string;
  /** MIME type, e.g. 'image/png'. */
  mime: string;
  /** Optional friendly name (extension will be coerced from mime). */
  suggestedName?: string;
}

export interface ImageSaveResult {
  savedPath: string;
  /** Path relative to the current markdown file, when resolution allows it. */
  relativePath?: string;
  width?: number;
  height?: number;
}

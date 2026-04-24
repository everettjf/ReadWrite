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
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface ScreenshotResult {
  dataUrl: string;
  savedPath?: string;
  width: number;
  height: number;
}

export interface MarkdownDocument {
  path?: string;
  content: string;
  dirty: boolean;
  frontmatter?: Record<string, unknown>;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  editorMode: 'wysiwyg' | 'source';
  screenshotSavePath?: string;
  lastOpenedDoc?: string;
  fontSize: number;
  splitRatio: number;
}

export interface FileTreeEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeEntry[];
}

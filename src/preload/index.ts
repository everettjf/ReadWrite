import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { IPC } from '@shared/ipc-channels';
import type {
  Tab,
  TabBounds,
  ScreenshotOptions,
  ScreenshotResult,
  AppSettings,
  FileTreeEntry,
  AICompletionRequest,
  AICompletionResult,
  ImageSaveOptions,
  ImageSaveResult,
  KnownWorkspace,
  DocSummary,
  WechatPublishPayload,
  WechatPublishResult,
} from '@shared/types';

interface SuggestedParent {
  path: string;
  label: string;
  exists: boolean;
  hint?: string;
}

const api = {
  tabs: {
    create: (payload: { url: string; kind?: 'web' | 'github' }): Promise<Tab> =>
      ipcRenderer.invoke(IPC.TAB_CREATE, payload),
    close: (id: string): Promise<void> => ipcRenderer.invoke(IPC.TAB_CLOSE, id),
    focus: (id: string): Promise<void> => ipcRenderer.invoke(IPC.TAB_FOCUS, id),
    setBounds: (id: string, bounds: TabBounds): Promise<void> =>
      ipcRenderer.invoke(IPC.TAB_UPDATE_BOUNDS, { id, bounds }),
    setVisibility: (id: string, visible: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC.TAB_SET_VISIBILITY, { id, visible }),
    navigate: (id: string, url: string): Promise<void> =>
      ipcRenderer.invoke(IPC.TAB_NAVIGATE, { id, url }),
    goBack: (id: string): Promise<void> => ipcRenderer.invoke(IPC.TAB_GO_BACK, id),
    goForward: (id: string): Promise<void> => ipcRenderer.invoke(IPC.TAB_GO_FORWARD, id),
    reload: (id: string): Promise<void> => ipcRenderer.invoke(IPC.TAB_RELOAD, id),
    onStateChange: (
      listener: (state: {
        id: string;
        title: string;
        url: string;
        loading: boolean;
        canGoBack: boolean;
        canGoForward: boolean;
      }) => void,
    ): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
        listener(payload);
      ipcRenderer.on(IPC.TAB_STATE_CHANGED, handler);
      return () => ipcRenderer.off(IPC.TAB_STATE_CHANGED, handler);
    },
  },

  screenshot: {
    captureTab: (opts: ScreenshotOptions): Promise<ScreenshotResult | null> =>
      ipcRenderer.invoke(IPC.SCREENSHOT_TAB, opts),
  },

  image: {
    save: (opts: ImageSaveOptions): Promise<ImageSaveResult> =>
      ipcRenderer.invoke(IPC.IMAGE_SAVE, opts),
  },

  fs: {
    readFile: (path: string): Promise<string> => ipcRenderer.invoke(IPC.FS_READ_FILE, path),
    readFileBase64: (path: string): Promise<{ base64: string; mime: string }> =>
      ipcRenderer.invoke(IPC.FS_READ_FILE_BASE64, path),
    writeFile: (path: string, content: string): Promise<void> =>
      ipcRenderer.invoke(IPC.FS_WRITE_FILE, { path, content }),
    openDialog: (opts: {
      title?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
      directory?: boolean;
    }): Promise<string[] | null> => ipcRenderer.invoke(IPC.FS_OPEN_DIALOG, opts),
    saveDialog: (opts: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): Promise<string | null> => ipcRenderer.invoke(IPC.FS_SAVE_DIALOG, opts),
    listDir: (path: string): Promise<FileTreeEntry[]> => ipcRenderer.invoke(IPC.FS_LIST_DIR, path),
    watchDir: (path: string): Promise<void> => ipcRenderer.invoke(IPC.FS_WATCH_DIR, path),
    unwatchDir: (path: string): Promise<void> => ipcRenderer.invoke(IPC.FS_UNWATCH_DIR, path),
    pathExists: (path: string): Promise<boolean> => ipcRenderer.invoke(IPC.FS_PATH_EXISTS, path),
    onWatchEvent: (
      listener: (evt: { root: string; event: string; path: string }) => void,
    ): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, payload: Parameters<typeof listener>[0]) =>
        listener(payload);
      ipcRenderer.on(IPC.FS_WATCH_EVENT, handler);
      return () => ipcRenderer.off(IPC.FS_WATCH_EVENT, handler);
    },
  },

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, patch),
    onChanged: (listener: (next: AppSettings) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, next: AppSettings) => listener(next);
      ipcRenderer.on(IPC.SETTINGS_CHANGED, handler);
      return () => ipcRenderer.off(IPC.SETTINGS_CHANGED, handler);
    },
  },

  session: {
    load: <T = unknown>(): Promise<T | null> => ipcRenderer.invoke(IPC.SESSION_LOAD),
    save: (payload: unknown): Promise<void> => ipcRenderer.invoke(IPC.SESSION_SAVE, payload),
  },

  shell: {
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.SHELL_OPEN_EXTERNAL, url),
  },

  app: {
    openSettings: (): Promise<void> => ipcRenderer.invoke(IPC.APP_OPEN_SETTINGS),
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  },

  workspace: {
    listKnown: (): Promise<KnownWorkspace[]> => ipcRenderer.invoke(IPC.WORKSPACE_LIST_KNOWN),
    getActive: (): Promise<string | null> => ipcRenderer.invoke(IPC.WORKSPACE_GET_ACTIVE),
    setActive: (path: string): Promise<KnownWorkspace> =>
      ipcRenderer.invoke(IPC.WORKSPACE_SET_ACTIVE, path),
    onActiveChanged: (listener: (next: string | null) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, next: string | null): void => listener(next);
      ipcRenderer.on(IPC.WORKSPACE_ACTIVE_CHANGED, handler);
      return () => ipcRenderer.off(IPC.WORKSPACE_ACTIVE_CHANGED, handler);
    },
    create: (opts: { parent: string; name: string; activate?: boolean }): Promise<KnownWorkspace> =>
      ipcRenderer.invoke(IPC.WORKSPACE_CREATE, opts),
    renameKnown: (opts: { path: string; newName: string }): Promise<KnownWorkspace[]> =>
      ipcRenderer.invoke(IPC.WORKSPACE_RENAME_KNOWN, opts),
    forget: (path: string): Promise<KnownWorkspace[]> =>
      ipcRenderer.invoke(IPC.WORKSPACE_FORGET, path),
    getSuggestedParents: (): Promise<SuggestedParent[]> =>
      ipcRenderer.invoke(IPC.WORKSPACE_GET_SUGGESTED_PARENTS),
    reveal: (path: string): Promise<void> => ipcRenderer.invoke(IPC.WORKSPACE_REVEAL, path),
    listDocs: (workspacePath?: string): Promise<DocSummary[]> =>
      ipcRenderer.invoke(IPC.WORKSPACE_LIST_DOCS, workspacePath),

    // Document operations (anchored to active workspace)
    createNew: (opts: {
      suggestedName?: string;
      initialContent?: string;
      parent?: string;
    }): Promise<string> => ipcRenderer.invoke(IPC.DOC_CREATE_NEW, opts),
    renameDoc: (opts: {
      currentPath: string;
      newName: string;
      newParent?: string;
    }): Promise<string> => ipcRenderer.invoke(IPC.DOC_RENAME, opts),
    revealInFinder: (path: string): Promise<void> =>
      ipcRenderer.invoke(IPC.DOC_REVEAL_IN_FINDER, path),
    trashDoc: (mdPath: string): Promise<void> => ipcRenderer.invoke(IPC.DOC_TRASH, mdPath),
    getLastDoc: (workspacePath: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.LAST_DOC_GET, workspacePath),
    setLastDoc: (workspace: string, docPath: string | null): Promise<void> =>
      ipcRenderer.invoke(IPC.LAST_DOC_SET, { workspace, docPath }),
  },

  ai: {
    complete: (req: AICompletionRequest): Promise<AICompletionResult> =>
      ipcRenderer.invoke(IPC.AI_COMPLETE, req),
  },

  wechat: {
    testCredentials: (): Promise<{ ok: boolean; message: string }> =>
      ipcRenderer.invoke(IPC.WECHAT_TEST_CREDENTIALS),
    publishDraft: (payload: WechatPublishPayload): Promise<WechatPublishResult> =>
      ipcRenderer.invoke(IPC.WECHAT_PUBLISH, payload),
    freepublish: (draftMediaId: string): Promise<{ publishId: string }> =>
      ipcRenderer.invoke(IPC.WECHAT_FREEPUBLISH, { draftMediaId }),
  },
} as const;

export type ReadWriteAPI = typeof api;

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  (globalThis as unknown as { electron: typeof electronAPI }).electron = electronAPI;
  (globalThis as unknown as { api: typeof api }).api = api;
}

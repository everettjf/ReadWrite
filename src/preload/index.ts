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
} from '@shared/types';

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

  fs: {
    readFile: (path: string): Promise<string> => ipcRenderer.invoke(IPC.FS_READ_FILE, path),
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

  ai: {
    complete: (req: AICompletionRequest): Promise<AICompletionResult> =>
      ipcRenderer.invoke(IPC.AI_COMPLETE, req),
  },

  wechat: {
    testCredentials: (): Promise<{ ok: boolean; message: string }> =>
      ipcRenderer.invoke(IPC.WECHAT_TEST_CREDENTIALS),
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

import { BrowserWindow, nativeTheme } from 'electron';

interface MainWindowOptions {
  preloadPath: string;
  devUrl?: string;
  indexHtml: string;
  isDev: boolean;
}

export function createMainWindow(opts: MainWindowOptions): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: process.platform !== 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: opts.preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      // The editor needs to display images via file:// URLs that point
      // into the user's workspace. With webSecurity on, those are blocked
      // when the renderer is served over http(s) (dev server). The renderer
      // only loads local React + our trusted Markdown content — no remote
      // origin runs in this BrowserWindow — so disabling is safe.
      webSecurity: false,
    },
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  if (opts.devUrl) {
    win.loadURL(opts.devUrl);
    if (opts.isDev) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    win.loadFile(opts.indexHtml);
  }

  return win;
}

export interface SettingsWindowOptions {
  preloadPath: string;
  devUrl?: string;
  indexHtml: string;
  parent?: BrowserWindow;
}

let settingsWindowRef: BrowserWindow | null = null;

export function openSettingsWindow(opts: SettingsWindowOptions): BrowserWindow {
  if (settingsWindowRef && !settingsWindowRef.isDestroyed()) {
    settingsWindowRef.focus();
    return settingsWindowRef;
  }

  const win = new BrowserWindow({
    width: 820,
    height: 600,
    minWidth: 720,
    minHeight: 480,
    show: false,
    parent: opts.parent,
    modal: false,
    resizable: true,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    title: 'ReadWrite Settings',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: opts.preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      webSecurity: false,
    },
  });

  win.on('ready-to-show', () => win.show());
  win.on('closed', () => {
    settingsWindowRef = null;
  });

  if (opts.devUrl) {
    win.loadURL(`${opts.devUrl}#/settings`);
  } else {
    win.loadFile(opts.indexHtml, { hash: '/settings' });
  }

  settingsWindowRef = win;
  return win;
}

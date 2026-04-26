import { BrowserWindow, nativeTheme } from 'electron';
import { kvGet } from './db';
import type { AppSettings } from '@shared/types';

interface MainWindowOptions {
  preloadPath: string;
  devUrl?: string;
  indexHtml: string;
  isDev: boolean;
}

/**
 * Resolve the user's chosen theme synchronously so we can hand the right
 * background colour to a new BrowserWindow before the renderer mounts.
 * Without this, opening the Settings window flashes white-on-dark for a
 * frame or two while the React app's dark-mode class kicks in.
 */
function resolveBackgroundColor(): string {
  const stored = kvGet<Partial<AppSettings>>('settings');
  const theme = stored?.theme ?? 'system';
  const isDark = theme === 'dark' || (theme === 'system' && nativeTheme.shouldUseDarkColors);
  return isDark ? '#0a0a0a' : '#ffffff';
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
    backgroundColor: resolveBackgroundColor(),
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
    backgroundColor: resolveBackgroundColor(),
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

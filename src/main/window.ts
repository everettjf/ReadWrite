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

import chokidar, { type FSWatcher } from 'chokidar';
import type { BrowserWindow } from 'electron';
import { IPC } from '@shared/ipc-channels';

export class FileWatcherHub {
  private watchers = new Map<string, FSWatcher>();

  constructor(private win: BrowserWindow) {}

  watch(dirPath: string): void {
    if (this.watchers.has(dirPath)) return;
    const watcher = chokidar.watch(dirPath, {
      ignored: (p) => /(^|[\\/])(\.git|node_modules|\.DS_Store)([\\/]|$)/.test(p),
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });
    watcher.on('all', (event, filePath) => {
      if (this.win.isDestroyed()) return;
      this.win.webContents.send(IPC.FS_WATCH_EVENT, {
        root: dirPath,
        event,
        path: filePath,
      });
    });
    this.watchers.set(dirPath, watcher);
  }

  unwatch(dirPath: string): void {
    const w = this.watchers.get(dirPath);
    if (w) {
      w.close();
      this.watchers.delete(dirPath);
    }
  }

  destroyAll(): void {
    for (const w of this.watchers.values()) {
      w.close();
    }
    this.watchers.clear();
  }
}

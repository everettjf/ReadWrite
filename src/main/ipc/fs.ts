import { ipcMain, dialog } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { FileTreeEntry } from '@shared/types';

const IGNORED = new Set(['.git', 'node_modules', '.DS_Store', '.next', 'dist', 'out', '.cache']);

async function walk(dirPath: string, depth = 3): Promise<FileTreeEntry[]> {
  if (depth < 0) return [];
  let entries: Array<{
    name: string;
    isDirectory: () => boolean;
    isFile: () => boolean;
  }>;
  try {
    entries = await readdir(dirPath, { withFileTypes: true, encoding: 'utf8' });
  } catch {
    return [];
  }
  const result: FileTreeEntry[] = [];
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const p = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: p,
        isDirectory: true,
        children: await walk(p, depth - 1),
      });
    } else if (entry.isFile()) {
      result.push({ name: entry.name, path: p, isDirectory: false });
    }
  }
  result.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return result;
}

export function registerFsIpc(ctx: IpcContext): void {
  ipcMain.handle(IPC.FS_READ_FILE, async (_e, filePath: string): Promise<string> => {
    return await readFile(filePath, 'utf8');
  });

  ipcMain.handle(
    IPC.FS_WRITE_FILE,
    async (_e, payload: { path: string; content: string }): Promise<void> => {
      await mkdir(dirname(payload.path), { recursive: true });
      await writeFile(payload.path, payload.content, 'utf8');
    },
  );

  ipcMain.handle(
    IPC.FS_OPEN_DIALOG,
    async (
      _e,
      opts: { title?: string; filters?: Electron.FileFilter[]; directory?: boolean },
    ): Promise<string[] | null> => {
      const win = ctx.getMainWindow();
      if (!win) return null;
      const result = await dialog.showOpenDialog(win, {
        title: opts.title,
        filters: opts.filters,
        properties: opts.directory ? ['openDirectory'] : ['openFile'],
      });
      if (result.canceled) return null;
      return result.filePaths;
    },
  );

  ipcMain.handle(
    IPC.FS_SAVE_DIALOG,
    async (
      _e,
      opts: { title?: string; defaultPath?: string; filters?: Electron.FileFilter[] },
    ): Promise<string | null> => {
      const win = ctx.getMainWindow();
      if (!win) return null;
      const result = await dialog.showSaveDialog(win, {
        title: opts.title,
        defaultPath: opts.defaultPath,
        filters: opts.filters,
      });
      if (result.canceled || !result.filePath) return null;
      return result.filePath;
    },
  );

  ipcMain.handle(IPC.FS_LIST_DIR, async (_e, dirPath: string): Promise<FileTreeEntry[]> => {
    const info = await stat(dirPath).catch(() => null);
    if (!info || !info.isDirectory()) return [];
    return walk(dirPath, 3);
  });

  ipcMain.handle(IPC.FS_WATCH_DIR, (_e, dirPath: string) => {
    ctx.getWatcherHub().watch(dirPath);
  });

  ipcMain.handle(IPC.FS_UNWATCH_DIR, (_e, dirPath: string) => {
    ctx.getWatcherHub().unwatch(dirPath);
  });
}

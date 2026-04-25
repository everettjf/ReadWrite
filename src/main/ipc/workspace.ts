import { app, ipcMain, shell } from 'electron';
import { mkdir, rename, access, writeFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import { getCurrentSettings } from './settings';

/**
 * Workspace IPC handlers.
 *
 * The workspace model: each document is its own folder containing the
 * markdown file and an `images/` subfolder. The whole folder is portable —
 * move it anywhere and the relative-path image refs keep working.
 *
 *   <workspace-root>/
 *     My First Note/
 *       My First Note.md
 *       images/
 *         screenshot-1.png
 *
 * `workspaceRoot` defaults to `~/Documents/ReadWrite` and is configurable
 * in Settings → Editor → Workspace.
 */

function defaultWorkspaceRoot(): string {
  return join(app.getPath('documents'), 'ReadWrite');
}

function activeWorkspaceRoot(): string {
  return getCurrentSettings().workspaceRoot || defaultWorkspaceRoot();
}

// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\x00-\x1f]/g;

function sanitizeDocName(name: string): string {
  const cleaned = (name ?? '').replace(FORBIDDEN, '-').replace(/\s+/g, ' ').trim().slice(0, 80);
  return cleaned || 'Untitled';
}

function timestampForName(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function uniqueFolderPath(parent: string, baseName: string): Promise<string> {
  for (let i = 0; i < 200; i += 1) {
    const candidate = join(parent, i === 0 ? baseName : `${baseName} (${i + 1})`);
    try {
      await access(candidate);
    } catch {
      return candidate;
    }
  }
  return join(parent, `${baseName} (${Date.now()})`);
}

export function registerWorkspaceIpc(_ctx: IpcContext): void {
  ipcMain.handle(IPC.WORKSPACE_GET_DEFAULT_ROOT, () => defaultWorkspaceRoot());

  ipcMain.handle(IPC.WORKSPACE_ENSURE_ROOT, async (): Promise<string> => {
    const root = activeWorkspaceRoot();
    await mkdir(root, { recursive: true });
    return root;
  });

  ipcMain.handle(
    IPC.DOC_CREATE_NEW,
    async (
      _e,
      opts: { suggestedName?: string; initialContent?: string; parent?: string },
    ): Promise<string> => {
      const root = opts.parent ?? activeWorkspaceRoot();
      await mkdir(root, { recursive: true });
      const baseName = sanitizeDocName(opts.suggestedName || `Untitled - ${timestampForName()}`);
      const folderPath = await uniqueFolderPath(root, baseName);
      await mkdir(folderPath, { recursive: true });
      await mkdir(join(folderPath, 'images'), { recursive: true });
      const filePath = join(folderPath, `${basename(folderPath)}.md`);
      await writeFile(filePath, opts.initialContent ?? '', 'utf8');
      return filePath;
    },
  );

  ipcMain.handle(
    IPC.DOC_RENAME,
    async (
      _e,
      opts: { currentPath: string; newName: string; newParent?: string },
    ): Promise<string> => {
      const currentFolder = dirname(opts.currentPath);
      const parent = opts.newParent || dirname(currentFolder);
      const newFolderName = sanitizeDocName(opts.newName);
      const targetFolder =
        join(parent, newFolderName) === currentFolder
          ? currentFolder
          : await uniqueFolderPath(parent, newFolderName);

      if (targetFolder !== currentFolder) {
        await rename(currentFolder, targetFolder);
      }

      // Make sure the .md filename inside matches the folder name.
      const oldMdName = basename(opts.currentPath);
      const oldMdInTarget = join(targetFolder, oldMdName);
      const desiredMdPath = join(targetFolder, `${basename(targetFolder)}.md`);
      if (oldMdInTarget !== desiredMdPath) {
        await rename(oldMdInTarget, desiredMdPath);
      }
      return desiredMdPath;
    },
  );

  ipcMain.handle(IPC.DOC_REVEAL_IN_FINDER, async (_e, path: string): Promise<void> => {
    shell.showItemInFolder(path);
  });

  ipcMain.handle(IPC.FS_PATH_EXISTS, async (_e, path: string): Promise<boolean> => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  });
}

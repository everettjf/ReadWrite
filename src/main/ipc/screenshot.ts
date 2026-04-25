import { ipcMain, app } from 'electron';
import { IPC } from '@shared/ipc-channels';
import type { IpcContext } from './index';
import type {
  ScreenshotOptions,
  ScreenshotResult,
  AppSettings,
  ImageSaveOptions,
  ImageSaveResult,
} from '@shared/types';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname, relative, isAbsolute, sep } from 'node:path';
import { getCurrentSettings } from './settings';

interface ResolvedDir {
  /** Absolute directory where the image will be saved. */
  absDir: string;
  /** Directory used for computing the relative href in markdown, if applicable. */
  baseForRelative: string | null;
}

function resolveImagesDir(settings: AppSettings, markdownPath: string | null): ResolvedDir {
  const subfolder = (settings.imagesDirSubfolderName || 'images').replace(/[\\/]+$/, '');

  if (settings.imagesDirMode === 'next-to-doc' && markdownPath) {
    const docDir = dirname(markdownPath);
    return { absDir: join(docDir, subfolder), baseForRelative: docDir };
  }

  if (settings.imagesDirMode === 'custom' && settings.imagesDirCustom) {
    const custom = settings.imagesDirCustom;
    const absDir = isAbsolute(custom) ? custom : join(app.getPath('home'), custom);
    return { absDir, baseForRelative: markdownPath ? dirname(markdownPath) : null };
  }

  // pictures (default fallback)
  return {
    absDir: join(app.getPath('pictures'), 'ReadWrite'),
    baseForRelative: markdownPath ? dirname(markdownPath) : null,
  };
}

function toPosixPath(p: string): string {
  return p.split(sep).join('/');
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'bin';
  }
}

function sanitizeBaseName(name: string): string {
  return (
    (name || `image-${Date.now()}`)
      .replace(/\.[^./\\]+$/, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `image-${Date.now()}`
  );
}

async function uniqueFilePath(dir: string, baseName: string, ext: string): Promise<string> {
  const tryPath = (n: number): string =>
    join(dir, n === 0 ? `${baseName}.${ext}` : `${baseName}-${n}.${ext}`);
  for (let i = 0; i < 100; i++) {
    const p = tryPath(i);
    try {
      await access(p);
    } catch {
      return p;
    }
  }
  return tryPath(Date.now());
}

export function registerScreenshotIpc(ctx: IpcContext): void {
  ipcMain.handle(
    IPC.SCREENSHOT_TAB,
    async (_e, opts: ScreenshotOptions): Promise<ScreenshotResult | null> => {
      const tabs = ctx.getTabManager();
      const base = await tabs.screenshot(opts.tabId);
      if (!base) return null;

      const settings = getCurrentSettings();
      const { absDir, baseForRelative } = resolveImagesDir(settings, opts.markdownPath ?? null);

      try {
        await mkdir(absDir, { recursive: true });
        const filename = `screenshot-${Date.now()}.png`;
        const savedPath = join(absDir, filename);
        const buf = Buffer.from(base.dataUrl.split(',')[1]!, 'base64');
        await writeFile(savedPath, buf);

        let relativePath: string | undefined;
        if (baseForRelative) {
          const rel = relative(baseForRelative, savedPath);
          // Only treat as a portable relative href if it doesn't escape the doc dir
          if (!rel.startsWith('..') && !isAbsolute(rel)) {
            relativePath = toPosixPath(rel);
          }
        }

        return { ...base, savedPath, relativePath };
      } catch (err) {
        console.error('[screenshot] save failed:', err);
        return base;
      }
    },
  );

  ipcMain.handle(IPC.IMAGE_SAVE, async (_e, opts: ImageSaveOptions): Promise<ImageSaveResult> => {
    const settings = getCurrentSettings();
    const { absDir, baseForRelative } = resolveImagesDir(settings, opts.markdownPath ?? null);
    await mkdir(absDir, { recursive: true });

    const ext = mimeToExt(opts.mime);
    const baseName = sanitizeBaseName(opts.suggestedName ?? `image-${Date.now()}`);
    const savedPath = await uniqueFilePath(absDir, baseName, ext);

    const buf = Buffer.from(opts.base64, 'base64');
    await writeFile(savedPath, buf);

    let relativePath: string | undefined;
    if (baseForRelative) {
      const rel = relative(baseForRelative, savedPath);
      if (!rel.startsWith('..') && !isAbsolute(rel)) {
        relativePath = toPosixPath(rel);
      }
    }
    return { savedPath, relativePath };
  });
}

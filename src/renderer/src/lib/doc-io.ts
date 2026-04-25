import { rewriteFileUrlsToRelative, rewriteRelativeToFileUrls } from './path-transform';

export interface OpenedDoc {
  path: string;
  content: string;
}

/** Open a markdown file via the native dialog. Returns null on cancel. */
export async function openMarkdownFromDialog(): Promise<OpenedDoc | null> {
  const paths = await window.api.fs.openDialog({
    title: 'Open Markdown',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (!paths || paths.length === 0) return null;
  return await openMarkdownAtPath(paths[0]!);
}

export async function openMarkdownAtPath(path: string): Promise<OpenedDoc> {
  const raw = await window.api.fs.readFile(path);
  const content = rewriteRelativeToFileUrls(raw, path);
  return { path, content };
}

/** Persist markdown content to disk, transforming `file://` image refs to relative. */
export async function saveMarkdown(content: string, path: string): Promise<void> {
  const transformed = rewriteFileUrlsToRelative(content, path);
  await window.api.fs.writeFile(path, transformed);
}

/** Suggest a doc folder name from the document's H1, falling back to a timestamp. */
export function suggestDocNameFromContent(content: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  const h1 = m?.[1]?.trim();
  if (h1 && !/^welcome to readwrite/i.test(h1)) {
    return h1;
  }
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `Untitled - ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export async function createNewDocument(opts: {
  initialContent?: string;
  suggestedName?: string;
}): Promise<OpenedDoc> {
  const initialContent = opts.initialContent ?? '';
  const suggestedName = opts.suggestedName ?? suggestDocNameFromContent(initialContent);
  const newPath = await window.api.workspace.createNew({
    suggestedName,
    initialContent,
  });
  return { path: newPath, content: initialContent };
}

export async function renameDocFolder(currentPath: string, newName: string): Promise<string> {
  return await window.api.workspace.renameDoc({ currentPath, newName });
}

/** Quick basename helper (forward + back slashes). */
export function docBasename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** The folder containing a doc.md, useful for "reveal in finder" etc. */
export function docFolder(path: string): string {
  return path.replace(/[\\/][^\\/]+$/, '');
}

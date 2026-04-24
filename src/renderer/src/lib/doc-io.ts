export interface OpenedDoc {
  path: string | null;
  content: string;
}

export async function openMarkdownFromDialog(): Promise<OpenedDoc | null> {
  const paths = await window.api.fs.openDialog({
    title: 'Open Markdown',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (!paths || paths.length === 0) return null;
  const path = paths[0]!;
  const content = await window.api.fs.readFile(path);
  return { path, content };
}

export async function saveMarkdownToPath(
  content: string,
  existingPath: string | null,
): Promise<string | null> {
  let path = existingPath;
  if (!path) {
    path = await window.api.fs.saveDialog({
      title: 'Save Markdown',
      defaultPath: 'untitled.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });
    if (!path) return null;
  }
  await window.api.fs.writeFile(path, content);
  return path;
}

/**
 * Markdown image-path transforms applied at the save/load boundary.
 *
 * In-memory editor content always carries `file://` URLs for images, so
 * Milkdown can render them directly. On disk we always store relative
 * paths (e.g. `images/foo.png`) so the document folder is portable.
 *
 *   load:  disk (relative)  →  in-memory (file://)
 *   save:  in-memory (file://)  →  disk (relative)
 */

const IMG_RE = /(!\[[^\]]*\]\()([^)]+)(\))/g;

function dirnameOf(p: string): string {
  const m = p.replace(/[\\/]+$/, '').match(/^(.*)[\\/][^\\/]+$/);
  return m ? m[1]! : '';
}

function joinPosix(dir: string, rel: string): string {
  return `${dir.replace(/\/+$/, '')}/${rel.replace(/^\/+/, '')}`;
}

function normalize(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Decode a `file://...` URL into an OS-style absolute path (with forward slashes). */
function fileUrlToPath(url: string): string | null {
  if (!url.startsWith('file://')) return null;
  let p = decodeURI(url.replace(/^file:\/\/+/, ''));
  // Windows: file:///C:/foo  →  /C:/foo  →  C:/foo
  if (/^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
  if (!p.startsWith('/') && !/^[A-Za-z]:\//.test(p)) {
    p = `/${p}`;
  }
  return p;
}

/** Build a `file://` URL from an OS path. */
export function pathToFileUrl(absPath: string): string {
  const n = normalize(absPath);
  // Windows: C:/foo  →  file:///C:/foo
  // Unix:    /foo    →  file:///foo
  if (/^[A-Za-z]:\//.test(n)) return `file:///${encodeURI(n)}`;
  return `file://${encodeURI(n)}`;
}

/** Save direction: `file://` URLs → relative paths (when they live under docDir). */
export function rewriteFileUrlsToRelative(markdown: string, docPath: string): string {
  const docDir = normalize(dirnameOf(docPath));
  if (!docDir) return markdown;
  return markdown.replace(IMG_RE, (whole, prefix, src, suffix) => {
    const absPath = fileUrlToPath(src);
    if (!absPath) return whole;
    const norm = normalize(absPath);
    if (norm === docDir || norm.startsWith(`${docDir}/`)) {
      const rel = norm.slice(docDir.length).replace(/^\/+/, '');
      return `${prefix}${rel}${suffix}`;
    }
    return whole; // outside the doc folder — leave the file:// alone
  });
}

/** Load direction: relative image paths → `file://` URLs the editor can render. */
export function rewriteRelativeToFileUrls(markdown: string, docPath: string): string {
  const docDir = normalize(dirnameOf(docPath));
  if (!docDir) return markdown;
  return markdown.replace(IMG_RE, (whole, prefix, src, suffix) => {
    if (/^([a-z][a-z0-9+.-]*:|\/|data:)/i.test(src)) return whole;
    const abs = joinPosix(docDir, src);
    return `${prefix}${pathToFileUrl(abs)}${suffix}`;
  });
}

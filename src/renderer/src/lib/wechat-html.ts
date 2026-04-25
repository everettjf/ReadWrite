import { marked } from 'marked';
import { getTheme, CODE_TEXT_STYLE, type ThemeRules } from './wechat-themes';

interface BuildOptions {
  /** The current markdown file path; needed to resolve relative image refs. */
  markdownPath: string | null;
  themeId: string;
}

/**
 * Render the given Markdown into a single self-contained HTML fragment
 * suitable for pasting into the WeChat 公众号 editor.
 *
 * Strategy mirrors Spute/obsidian-copy-to-mp:
 *   - No `<style>` tag emitted (WeChat strips them).
 *   - Every styled element gets `style="..."` per the chosen theme.
 *   - `<li>` children get wrapped in a `<p>` so WeChat doesn't inject `<section>`.
 *   - Local images are read from disk and inlined as `data:` URIs.
 */
export async function buildWeChatHtml(
  markdown: string,
  opts: BuildOptions,
): Promise<{ html: string; warnings: string[] }> {
  const warnings: string[] = [];

  marked.setOptions({ gfm: true, breaks: false });
  const rawHtml = await marked.parse(markdown);

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="rw-root">${rawHtml}</div>`, 'text/html');
  const root = doc.getElementById('rw-root');
  if (!root) {
    return { html: rawHtml, warnings: ['DOM parse failed; falling back to raw HTML.'] };
  }

  // 1) Inline images
  await inlineImages(root, opts.markdownPath, warnings);

  // 2) WeChat <li> quirk: wrap each li's content in a <p>
  wrapListItemContent(doc, root);

  // 3) Apply per-selector inline styles
  const theme = getTheme(opts.themeId);
  applyInlineStyles(root, theme.rules);

  // 4) Special-case `<pre><code>` — bare dark block, no syntax tokens
  styleCodeBlocks(root);

  // 5) Wrap with the container <section style=...>
  const containerStyle = theme.rules.container ?? '';
  const out = `<section style="${escapeAttr(containerStyle)}">${root.innerHTML}</section>`;

  return { html: out, warnings };
}

/** Copy HTML to the clipboard as both text/html and text/plain. */
export async function copyHtmlToClipboard(html: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([html], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
    return;
  }
  // Fallback: write plain text only.
  await navigator.clipboard.writeText(html);
}

// --- internals ---

function applyInlineStyles(root: HTMLElement, rules: ThemeRules): void {
  for (const [selector, style] of Object.entries(rules)) {
    if (!style || selector === 'container') continue;
    // pre/code get their own pass below
    if (selector === 'pre' || selector === 'code') continue;
    root.querySelectorAll(selector).forEach((el) => {
      const prev = el.getAttribute('style') ?? '';
      const merged = prev ? `${prev.replace(/;\s*$/, '')};${style}` : style;
      el.setAttribute('style', merged);
    });
  }
}

function styleCodeBlocks(root: HTMLElement): void {
  // <pre><code>...</code></pre>
  root.querySelectorAll('pre').forEach((pre) => {
    pre.setAttribute(
      'style',
      `margin: 1em 0; padding: 14px 16px; background: linear-gradient(to bottom, #2a2c33 0%, #383a42 8px, #383a42 100%); border-radius: 6px; overflow-x: auto; line-height: 1.5;`,
    );
    pre.querySelectorAll('code').forEach((code) => {
      // Strip any prior class-based highlighting so colors aren't lost on paste
      code.removeAttribute('class');
      code.setAttribute('style', CODE_TEXT_STYLE);
    });
  });

  // Inline `<code>` not inside <pre>
  root.querySelectorAll('code').forEach((code) => {
    if (code.closest('pre')) return;
    code.setAttribute(
      'style',
      `background: #f4f4f4; color: #c7254e; padding: 2px 6px; margin: 0 2px; border-radius: 3px; font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 0.92em; word-break: break-word;`,
    );
  });
}

/**
 * WeChat injects `<section>` wrappers around bare text inside `<li>`. Wrapping
 * children in a `<p>` first sidesteps that and keeps the list looking clean.
 */
function wrapListItemContent(doc: Document, root: HTMLElement): void {
  root.querySelectorAll('li').forEach((li) => {
    if (li.children.length === 1 && li.children[0]?.tagName === 'P') return;
    const wrapper = doc.createElement('p');
    wrapper.setAttribute('style', 'margin: 0; display: inline;');
    while (li.firstChild) {
      wrapper.appendChild(li.firstChild);
    }
    li.appendChild(wrapper);
  });
}

async function inlineImages(
  root: HTMLElement,
  markdownPath: string | null,
  warnings: string[],
): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  for (const img of imgs) {
    const src = img.getAttribute('src') ?? '';
    if (!src) continue;
    if (src.startsWith('data:')) continue; // already inline
    try {
      if (/^https?:\/\//i.test(src)) {
        // Leave remote URLs alone — WeChat will fetch them when pasting works,
        // and we'd hit CORS if we tried to fetch+canvas in the renderer.
        continue;
      }

      const absPath = await resolveImagePath(src, markdownPath);
      if (!absPath) {
        warnings.push(`Could not resolve image path: ${src}`);
        continue;
      }
      const { base64, mime } = await window.api.fs.readFileBase64(absPath);
      img.setAttribute('src', `data:${mime};base64,${base64}`);
    } catch (err) {
      warnings.push(`Failed to inline ${src}: ${(err as Error).message}`);
    }
  }
}

async function resolveImagePath(src: string, markdownPath: string | null): Promise<string | null> {
  if (src.startsWith('file://')) {
    try {
      return decodeURI(src.replace(/^file:\/\//, ''));
    } catch {
      return null;
    }
  }

  // Already absolute
  if (src.startsWith('/') || /^[A-Za-z]:[/\\]/.test(src)) {
    return src;
  }

  // Relative — needs a markdownPath base
  if (!markdownPath) return null;
  const baseDir = markdownPath.replace(/[/\\][^/\\]*$/, '');
  // Normalize separators (works on macOS/Linux paths; Windows accepts forward slashes too)
  const joined = `${baseDir}/${src}`.replace(/\/+/g, '/').replace(/\/\.\//g, '/');
  return joined;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

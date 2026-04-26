import { $prose } from '@milkdown/utils';
import { Plugin } from '@milkdown/prose/state';
import { useEditorStore } from '@/stores/editor';
import { pathToFileUrl } from '@/lib/path-transform';

/**
 * Custom ProseMirror node view that lets the markdown source carry
 * **relative** image paths (e.g. `images/snip-….png`) while the editor
 * still renders the actual file from disk.
 *
 * Without this we'd have to keep absolute `file://` URLs in the editor
 * content so the WYSIWYG view could load them — which then leaks into
 * the source-mode view, the clipboard, and any markdown copy/paste,
 * making everything look like:
 *
 *   ![](file:///Users/.../com~apple~CloudDocs/...%20Documents/...)
 *
 * With this plugin, the markdown attr `src` stays relative; we resolve
 * it against the active document's directory at render time only.
 */

function dirnameOf(p: string): string {
  const m = p.replace(/[\\/]+$/, '').match(/^(.*)[\\/][^\\/]+$/);
  return m ? m[1]! : '';
}

function joinPosix(dir: string, rel: string): string {
  return `${dir.replace(/\/+$/, '')}/${rel.replace(/^\/+/, '')}`;
}

function resolveSrc(src: string): string {
  if (!src) return src;
  // Already a URL with scheme (file://, https://, data:, blob:, …) — pass through.
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
  // Absolute filesystem path — wrap in file://.
  if (src.startsWith('/') || /^[A-Za-z]:[\\/]/.test(src)) {
    return pathToFileUrl(src);
  }
  // Relative path — anchor it to the current document's directory.
  const docPath = useEditorStore.getState().path;
  if (!docPath) return src;
  const docDir = dirnameOf(docPath).replace(/\\/g, '/');
  return pathToFileUrl(joinPosix(docDir, src));
}

export const relativeImagePlugin = $prose(
  () =>
    new Plugin({
      props: {
        nodeViews: {
          image(node) {
            const dom = document.createElement('img');
            const apply = (n: typeof node): void => {
              const src = (n.attrs.src ?? '') as string;
              if (src) dom.src = resolveSrc(src);
              const alt = (n.attrs.alt ?? '') as string;
              if (alt) dom.alt = alt;
              const title = (n.attrs.title ?? '') as string;
              if (title) dom.title = title;
            };
            apply(node);
            return {
              dom,
              update(newNode) {
                if (newNode.type !== node.type) return false;
                apply(newNode);
                return true;
              },
            };
          },
        },
      },
    }),
);

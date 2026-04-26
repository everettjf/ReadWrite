import { useEditorStore } from '@/stores/editor';
import { useMilkdownBridge } from '@/lib/milkdown-instance';
import { useSourceBridge } from '@/lib/source-bridge';

/**
 * The slice of editor capability the toolbar / AI flows actually need —
 * regardless of whether the user is in Milkdown WYSIWYG mode or
 * CodeMirror Source mode. Both editors implement these via their
 * respective bridges; `useActiveBridge` picks whichever is mounted.
 */
export interface ActiveEditorBridge {
  getSelectionText: () => string;
  replaceSelection: (md: string) => void;
  insertAtCursor: (md: string) => void;
}

export function useActiveBridge(): ActiveEditorBridge | null {
  const mode = useEditorStore((s) => s.mode);
  const milkdown = useMilkdownBridge();
  const source = useSourceBridge();

  if (mode === 'wysiwyg') {
    if (!milkdown) return null;
    return {
      getSelectionText: milkdown.getSelectionText,
      replaceSelection: milkdown.replaceSelection,
      // Milkdown's bridge calls this `insertMarkdown` — same semantics:
      // parses the markdown and inserts ProseMirror nodes at the cursor.
      insertAtCursor: milkdown.insertMarkdown,
    };
  }

  if (!source) return null;
  return source;
}

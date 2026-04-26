import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { useEditorStore } from '@/stores/editor';
import { SourceBridgeProvider } from '@/lib/source-bridge';

interface SourceEditorProps {
  children?: ReactNode;
}

export function SourceEditor({ children }: SourceEditorProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);

  useEffect(() => {
    if (!hostRef.current) return;

    const isDark = document.documentElement.classList.contains('dark');

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const next = update.state.doc.toString();
      const cur = useEditorStore.getState().content;
      if (next !== cur) {
        setContent(next, { markDirty: true });
      }
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        indentOnInput(),
        markdown(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px',
          },
          '.cm-scroller': {
            fontFamily: 'JetBrains Mono, SF Mono, Menlo, Consolas, monospace',
            lineHeight: '1.6',
          },
        }),
        ...(isDark ? [oneDark] : []),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === content) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: content },
    });
  }, [content]);

  const getView = useCallback((): EditorView | null => viewRef.current, []);

  return (
    <SourceBridgeProvider getView={getView}>
      <div className="flex h-full w-full flex-col">
        {children}
        <div ref={hostRef} className="flex-1 overflow-auto" />
      </div>
    </SourceBridgeProvider>
  );
}

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { EditorView } from '@codemirror/view';

/**
 * Bridge for AI / clipboard actions to talk to the CodeMirror source-mode
 * editor. Mirrors the subset of MilkdownBridge that the editor toolbar
 * uses, so the toolbar can call the same methods regardless of which
 * editor is active.
 */
export interface SourceBridge {
  getSelectionText: () => string;
  replaceSelection: (md: string) => void;
  insertAtCursor: (md: string) => void;
}

const SourceBridgeContext = createContext<SourceBridge | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSourceBridge(): SourceBridge | null {
  return useContext(SourceBridgeContext);
}

interface ProviderProps {
  /** A getter so the bridge always reaches the latest live CodeMirror view. */
  getView: () => EditorView | null;
  children: ReactNode;
}

export function SourceBridgeProvider({ getView, children }: ProviderProps): JSX.Element {
  const bridge = useMemo<SourceBridge>(
    () => ({
      getSelectionText: () => {
        const view = getView();
        if (!view) return '';
        const { from, to } = view.state.selection.main;
        if (from === to) return '';
        return view.state.doc.sliceString(from, to);
      },
      replaceSelection: (md: string) => {
        const view = getView();
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: md },
          selection: { anchor: from + md.length },
        });
      },
      insertAtCursor: (md: string) => {
        const view = getView();
        if (!view) return;
        const { from } = view.state.selection.main;
        view.dispatch({
          changes: { from, to: from, insert: md },
          selection: { anchor: from + md.length },
        });
      },
    }),
    [getView],
  );

  return <SourceBridgeContext.Provider value={bridge}>{children}</SourceBridgeContext.Provider>;
}

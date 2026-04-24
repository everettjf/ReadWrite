import { useEffect, useMemo, useRef } from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, parserCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { clipboard } from '@milkdown/plugin-clipboard';
import { Slice } from '@milkdown/prose/model';
import { useEditorStore } from '@/stores/editor';
import { MilkdownBridgeContext, type MilkdownBridge } from '@/lib/milkdown-instance';

export function MilkdownEditor({ children }: { children?: React.ReactNode }): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const content = useEditorStore((s) => s.content);
  const setContent = useEditorStore((s) => s.setContent);

  // The content we render into on initial mount. Later changes are pushed
  // into the editor via effects to avoid resetting the document on every keystroke.
  const initialContent = useRef(content);

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;

    const boot = async (): Promise<void> => {
      const editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, hostRef.current!);
          ctx.set(defaultValueCtx, initialContent.current);
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prev) => {
            if (markdown === prev) return;
            setContent(markdown, { markDirty: true });
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        .use(clipboard)
        .create();

      if (cancelled) {
        editor.destroy();
        return;
      }
      editorRef.current = editor;
    };

    boot().catch((err) => console.error('[milkdown] boot failed:', err));

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [setContent]);

  // When content is replaced externally (new doc, open file), reset editor body.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const currentMd = view.state.doc.textBetween(0, view.state.doc.content.size, '\n');
      // Milkdown listener fires on every keystroke, so we only want to replace
      // the doc when the external content doesn't match.
      if (currentMd.trim() === content.trim()) return;
      const parser = ctx.get(parserCtx);
      const doc = parser(content);
      if (!doc) return;
      const tr = view.state.tr.replace(
        0,
        view.state.doc.content.size,
        new Slice(doc.content, 0, 0),
      );
      view.dispatch(tr);
    });
  }, [content]);

  const bridge: MilkdownBridge = useMemo(
    () => ({
      getMarkdown: () => useEditorStore.getState().content,
      setMarkdown: (md: string) => useEditorStore.getState().setContent(md, { markDirty: false }),
      insertMarkdown: (md: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const parser = ctx.get(parserCtx);
          const doc = parser(md);
          if (!doc) return;
          const { from } = view.state.selection;
          const tr = view.state.tr.insert(from, doc.content);
          view.dispatch(tr);
        });
      },
      getSelectionText: () => {
        const editor = editorRef.current;
        if (!editor) return '';
        let text = '';
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { from, to } = view.state.selection;
          if (from === to) return;
          text = view.state.doc.textBetween(from, to, '\n', '\n');
        });
        return text;
      },
      replaceSelection: (md: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const parser = ctx.get(parserCtx);
          const doc = parser(md);
          if (!doc) return;
          const { from, to } = view.state.selection;
          const tr = view.state.tr.replaceWith(from, to, doc.content);
          view.dispatch(tr);
        });
      },
      getEditor: () => editorRef.current,
    }),
    [],
  );

  return (
    <MilkdownBridgeContext.Provider value={bridge}>
      <div className="flex h-full w-full flex-col">
        {children}
        <div className="milkdown flex-1 overflow-auto" ref={hostRef} />
      </div>
    </MilkdownBridgeContext.Provider>
  );
}

import { useEffect, useRef } from 'react';
import { Sparkles, BookOpen, Languages, MessageCircle } from 'lucide-react';
import { useReaderSelectionStore } from '@/stores/reader-selection';
import { useEditorCommandsStore } from '@/stores/editor-commands';
import { useSettingsStore } from '@/stores/settings';
import { useT } from '@/i18n';

const TOOLBAR_HEIGHT = 36;
const TOOLBAR_GAP = 8;

/**
 * Floating toolbar that appears above a non-empty reader selection. Each
 * button dispatches an AI request through the editor-commands store —
 * which the editor picks up and routes to AIInterpretDialog. The dialog
 * is the existing inline-AI surface; from the user's perspective this
 * lets a passage in the reader become AI input that lands in the note,
 * without leaving the window.
 */
export function ReaderSelectionToolbar(): JSX.Element | null {
  const text = useReaderSelectionStore((s) => s.text);
  const rect = useReaderSelectionStore((s) => s.rect);
  const clear = useReaderSelectionStore((s) => s.clear);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const request = useEditorCommandsStore((s) => s.request);
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);

  // Clear the selection when the user clicks anywhere outside the
  // toolbar. We listen on the capture phase so we react before any
  // child handler can stopPropagation our chance to dismiss.
  useEffect(() => {
    if (!text) return;
    const onDown = (e: MouseEvent): void => {
      if (ref.current?.contains(e.target as Node)) return;
      clear();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [text, clear]);

  // ⌘⇧A / Ctrl+Shift+A → open the AI dialog with the current reader
  // selection prefilled and an empty prompt (custom mode). Fires only
  // when a selection actually exists — otherwise the keystroke is a
  // no-op and falls through to whatever else might own it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key.toLowerCase() !== 'a' || !e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
      const cur = useReaderSelectionStore.getState();
      if (!cur.text.trim()) return;
      e.preventDefault();
      request({ kind: 'interpret-reader-selection', text: cur.text, defaultPrompt: '' });
      clear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, clear]);

  if (!aiEnabled) return null;
  if (!text.trim() || !rect) return null;

  // Position above the selection if there's room, otherwise below it.
  const above = rect.top > TOOLBAR_HEIGHT + TOOLBAR_GAP;
  const top = above
    ? Math.max(TOOLBAR_GAP, rect.top - TOOLBAR_HEIGHT - TOOLBAR_GAP)
    : rect.top + rect.height + TOOLBAR_GAP;
  const left = Math.max(TOOLBAR_GAP, rect.left + rect.width / 2);

  const dispatch = (defaultPrompt: string): void => {
    request({ kind: 'interpret-reader-selection', text, defaultPrompt });
    clear();
  };

  return (
    <div
      ref={ref}
      className="pointer-events-auto fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-border bg-popover/95 p-0.5 text-xs shadow-lg backdrop-blur"
      style={{ top, left }}
      // Don't let mousedown inside the toolbar collapse the underlying
      // selection (some browsers blur the focused range on toolbar
      // click).
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolButton
        icon={<BookOpen className="h-3.5 w-3.5" />}
        label={t('reader.selection.summarize')}
        onClick={() => dispatch(t('reader.selection.prompt.summarize'))}
      />
      <ToolButton
        icon={<Languages className="h-3.5 w-3.5" />}
        label={t('reader.selection.translate')}
        onClick={() => dispatch(t('reader.selection.prompt.translate'))}
      />
      <ToolButton
        icon={<MessageCircle className="h-3.5 w-3.5" />}
        label={t('reader.selection.interpret')}
        onClick={() => dispatch(t('reader.selection.prompt.interpret'))}
      />
      <div className="mx-0.5 h-4 w-px bg-border" />
      <ToolButton
        icon={<Sparkles className="h-3.5 w-3.5" />}
        label={t('reader.selection.custom')}
        onClick={() => dispatch('')}
      />
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: JSX.Element;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded px-1.5 py-1 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      title={label}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

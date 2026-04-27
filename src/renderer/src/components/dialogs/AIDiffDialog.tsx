import { useEffect, useMemo, useState } from 'react';
import { diffLines, type Change } from 'diff';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, RefreshCw, Pencil, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativeViewMute } from '@/lib/native-view-mute';

interface AIDiffDialogProps {
  open: boolean;
  title: string;
  /** The text the AI was asked to revise. */
  original: string;
  /** AI's revision; null while still generating. */
  proposed: string | null;
  /** Error from the AI call, when applicable. */
  error: string | null;
  /** True while the AI request is in flight. */
  busy: boolean;
  onRegenerate: () => void;
  onAccept: (finalText: string) => void;
  onReject: () => void;
}

/**
 * Pre-application diff review for destructive AI edits (Polish, Translate,
 * Summarize). The user sees the AI's proposal as a unified diff against
 * the original, can switch to an editable view to tweak the result, and
 * must explicitly Accept before anything in the document changes. Reject
 * discards; Regenerate re-runs the same instruction.
 *
 * Modeled on Cursor's "Apply" flow and Notion AI's confirmation pattern —
 * the editor doesn't change until the user has seen exactly what the AI
 * is going to do.
 */
export function AIDiffDialog({
  open,
  title,
  original,
  proposed,
  error,
  busy,
  onRegenerate,
  onAccept,
  onReject,
}: AIDiffDialogProps): JSX.Element {
  const [view, setView] = useState<'diff' | 'edit'>('diff');
  const [editedText, setEditedText] = useState('');

  useNativeViewMute(open);

  // Sync editedText with the latest proposal so swapping into "edit" mode
  // starts from the AI's text. After the user types in the textarea we
  // stop overwriting (the proposal hasn't changed).
  useEffect(() => {
    if (proposed !== null) setEditedText(proposed);
  }, [proposed]);

  // Reset to diff view each time the dialog opens.
  useEffect(() => {
    if (open) setView('diff');
  }, [open]);

  const finalText = view === 'edit' ? editedText : (proposed ?? '');
  const canAccept = !busy && !!proposed && finalText.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onReject();
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Review the AI&apos;s revision before applying. Nothing in your document changes until
            you click <strong>Accept</strong>.
          </DialogDescription>
        </DialogHeader>

        {proposed !== null && !busy && !error && (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant={view === 'diff' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7"
              onClick={() => setView('diff')}
            >
              <Eye className="mr-1 h-3.5 w-3.5" /> Diff
            </Button>
            <Button
              variant={view === 'edit' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7"
              onClick={() => setView('edit')}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        )}

        <div className="max-h-[60vh] min-h-[12rem] overflow-auto rounded-md border border-border bg-muted/20">
          {busy && (
            <div className="space-y-2 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  Streaming
                  {proposed && proposed.length > 0 ? (
                    <>
                      {' · '}
                      <span className="font-mono text-foreground">
                        {proposed.length.toLocaleString()} chars
                      </span>
                    </>
                  ) : (
                    '…'
                  )}
                </span>
              </div>
              {proposed && proposed.length > 0 ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/85">
                  {proposed}
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-foreground/60 align-middle" />
                </pre>
              ) : (
                <div className="text-xs italic text-muted-foreground">Waiting for first token…</div>
              )}
            </div>
          )}
          {!busy && error && (
            <div className="whitespace-pre-wrap p-4 text-sm text-destructive">{error}</div>
          )}
          {!busy && !error && proposed !== null && view === 'diff' && (
            <UnifiedDiff original={original} proposed={proposed} />
          )}
          {!busy && !error && proposed !== null && view === 'edit' && (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="block h-full min-h-[12rem] w-full resize-y bg-transparent p-3 font-mono text-xs leading-relaxed focus:outline-none"
              autoFocus
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onReject} disabled={busy}>
            <X className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button variant="outline" onClick={onRegenerate} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
          <Button onClick={() => onAccept(finalText)} disabled={!canAccept}>
            <Check className="mr-2 h-4 w-4" /> Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnifiedDiff({ original, proposed }: { original: string; proposed: string }): JSX.Element {
  const parts = useMemo<Change[]>(() => diffLines(original, proposed), [original, proposed]);
  return (
    <div className="font-mono text-xs leading-relaxed">
      {parts.flatMap((part, i) => {
        const lines = part.value.split('\n');
        // diffLines includes a trailing empty segment when the part ends with \n.
        if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
        return lines.map((line, j) => (
          <div
            key={`${i}-${j}`}
            className={cn(
              'flex gap-2 whitespace-pre-wrap px-3 py-0.5',
              part.added && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
              part.removed && 'bg-destructive/15 text-destructive line-through opacity-70',
              !part.added && !part.removed && 'text-muted-foreground',
            )}
          >
            <span className="w-3 shrink-0 select-none opacity-60">
              {part.added ? '+' : part.removed ? '−' : ' '}
            </span>
            <span className="flex-1 break-words">{line || ' '}</span>
          </div>
        ));
      })}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';

interface AIInterpretDialogProps {
  open: boolean;
  /** The text the user wants the AI to look at — selection text, or empty if none. */
  selectionText: string;
  /** Whole document fallback when there's no selection. */
  documentText: string;
  onCancel: () => void;
  /** Called with the chosen markdown (the AI response, edited or not) when the user confirms. */
  onInsert: (markdown: string, target: InsertTarget) => void;
}

export type InsertTarget = 'replace-selection' | 'insert-after-selection' | 'append-to-doc';

const DEFAULT_PROMPTS = [
  '解读一下',
  'Translate to English',
  'Summarize in 3 bullets',
  'Explain this code',
];

export function AIInterpretDialog({
  open,
  selectionText,
  documentText,
  onCancel,
  onInsert,
}: AIInterpretDialogProps): JSX.Element {
  const [prompt, setPrompt] = useState('解读一下');
  const [source, setSource] = useState<'selection' | 'document'>(
    selectionText.trim() ? 'selection' : 'document',
  );
  const [response, setResponse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResponse(null);
      setError(null);
      setBusy(false);
      setSource(selectionText.trim() ? 'selection' : 'document');
      setPrompt('解读一下');
    }
  }, [open, selectionText]);

  const run = async (): Promise<void> => {
    setError(null);
    setResponse(null);
    setBusy(true);
    try {
      const input = source === 'selection' ? selectionText : documentText;
      const result = await window.api.ai.complete({
        input,
        instruction: prompt,
      });
      setResponse(result.text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleInsert = (target: InsertTarget): void => {
    if (!response) return;
    onInsert(response, target);
  };

  const hasSelection = selectionText.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Interpret
          </DialogTitle>
          <DialogDescription>
            Ask the AI to do something with your selection or the whole document, then choose where
            to drop the response.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="aiPrompt">Prompt</Label>
            <Input
              id="aiPrompt"
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. 解读一下 / Translate / Summarize"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy && prompt.trim()) run();
              }}
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {DEFAULT_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Source</Label>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={source === 'selection'}
                  disabled={!hasSelection}
                  onChange={() => setSource('selection')}
                />
                <span className={hasSelection ? '' : 'text-muted-foreground'}>
                  Selection {hasSelection ? `(${selectionText.length} chars)` : '(none)'}
                </span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={source === 'document'}
                  onChange={() => setSource('document')}
                />
                <span>Whole document ({documentText.length} chars)</span>
              </label>
            </div>
          </div>

          <Button onClick={run} disabled={busy || !prompt.trim()}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Run
              </>
            )}
          </Button>

          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {response && (
            <div className="space-y-1.5">
              <Label>Response</Label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="block h-48 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">
                You can edit the response before inserting.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {response && hasSelection && source === 'selection' && (
            <>
              <Button variant="outline" onClick={() => handleInsert('insert-after-selection')}>
                Insert after selection
              </Button>
              <Button onClick={() => handleInsert('replace-selection')}>Replace selection</Button>
            </>
          )}
          {response && (!hasSelection || source === 'document') && (
            <Button onClick={() => handleInsert('append-to-doc')}>Append to document</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

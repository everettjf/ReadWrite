import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useNativeViewMute } from '@/lib/native-view-mute';
import { useSettingsStore } from '@/stores/settings';
import { useWorkspaceStore } from '@/stores/workspace';
import { useEditorStore } from '@/stores/editor';
import { extractActiveReader, type ExtractedSource } from '@/lib/reader-extract';
import {
  BUILT_IN_STYLES,
  BUILT_IN_TEMPLATES,
  buildBlogPrompt,
  mergeStyles,
  mergeTemplates,
  type AIPreset,
  type Lang,
  type Length,
} from '@/lib/ai-blog-presets';
import { createNewDocument, openMarkdownAtPath } from '@/lib/doc-io';

interface AIBlogDialogProps {
  open: boolean;
  onClose: () => void;
}

type OutputTarget = 'new-doc' | 'append' | 'replace';

interface Progress {
  chars: number;
  tail: string;
}

type Phase =
  | { kind: 'loading-source' }
  | { kind: 'form'; source: ExtractedSource }
  | { kind: 'generating'; source: ExtractedSource; jobId: string; progress: Progress }
  | { kind: 'error'; message: string }
  | { kind: 'source-error'; message: string };

export function AIBlogDialog({ open, onClose }: AIBlogDialogProps): JSX.Element {
  useNativeViewMute(open);
  const aiCliProvider = useSettingsStore((s) => s.aiCliProvider);
  const aiCustomStyles = useSettingsStore((s) => s.aiCustomStyles);
  const aiCustomTemplates = useSettingsStore((s) => s.aiCustomTemplates);
  const refreshDocs = useWorkspaceStore((s) => s.refreshDocs);

  const styles = mergeStyles(aiCustomStyles);
  const templates = mergeTemplates(aiCustomTemplates);

  const [phase, setPhase] = useState<Phase>({ kind: 'loading-source' });
  const [styleId, setStyleId] = useState<string>(BUILT_IN_STYLES[0]!.id);
  const [templateId, setTemplateId] = useState<string>(BUILT_IN_TEMPLATES[0]!.id);
  const [language, setLanguage] = useState<Lang>('zh');
  const [length, setLength] = useState<Length>('medium');
  const [outputTarget, setOutputTarget] = useState<OutputTarget>('new-doc');
  const [extra, setExtra] = useState('');

  // Track the active job so we can cancel; ref so async closures see the
  // latest value without re-subscribing.
  const jobIdRef = useRef<string | null>(null);

  // Fresh state every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setPhase({ kind: 'loading-source' });
    setExtra('');
    jobIdRef.current = null;

    let cancelled = false;
    extractActiveReader()
      .then((source) => {
        if (cancelled) return;
        setPhase({ kind: 'form', source });
      })
      .catch((err) => {
        if (cancelled) return;
        setPhase({ kind: 'source-error', message: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Subscribe to live progress events from the CLI subprocess and
  // funnel them into the current phase if it's the matching job.
  useEffect(() => {
    if (!open) return;
    const off = window.api.aiCli.onProgress((evt) => {
      setPhase((prev) =>
        prev.kind === 'generating' && prev.jobId === evt.jobId
          ? { ...prev, progress: { chars: evt.chars, tail: evt.tail } }
          : prev,
      );
    });
    return off;
  }, [open]);

  const style: AIPreset = styles.find((s) => s.id === styleId) ?? styles[0]!;
  const template: AIPreset = templates.find((t) => t.id === templateId) ?? templates[0]!;

  const startGeneration = async (): Promise<void> => {
    if (phase.kind !== 'form') return;
    if (aiCliProvider === 'none') {
      setPhase({
        kind: 'error',
        message: 'External AI CLI is disabled. Pick a provider in Settings → AI CLI first.',
      });
      return;
    }

    if (
      outputTarget === 'replace' &&
      useEditorStore.getState().content.trim().length > 0 &&
      !confirm(
        'Replace the entire current document with the generated blog? This cannot be undone via Undo.',
      )
    ) {
      return;
    }

    const prompt = buildBlogPrompt({
      template,
      style,
      language,
      length,
      extraInstructions: extra,
      source: phase.source,
    });

    const jobId = `blog-${Date.now().toString(36)}`;
    jobIdRef.current = jobId;
    setPhase({
      kind: 'generating',
      source: phase.source,
      jobId,
      progress: { chars: 0, tail: '' },
    });

    try {
      const result = await window.api.aiCli.generate({ prompt, jobId });
      // If the user cancelled while we were waiting, the IPC call would
      // have rejected and we'd be in catch. Reaching here = success.
      if (jobIdRef.current !== jobId) return; // superseded — shouldn't happen, defensive
      await applyResult(result.text, outputTarget);
      jobIdRef.current = null;
      onClose();
    } catch (err) {
      if (jobIdRef.current !== jobId) return; // user closed or restarted
      setPhase({ kind: 'error', message: (err as Error).message });
    }
  };

  const applyResult = async (text: string, target: OutputTarget): Promise<void> => {
    const editor = useEditorStore.getState();
    const trimmed = text.trim();
    if (!trimmed) throw new Error('AI returned empty output.');

    if (target === 'new-doc') {
      const created = await createNewDocument({ initialContent: trimmed });
      const opened = await openMarkdownAtPath(created.path);
      editor.setPath(opened.path);
      editor.setContent(opened.content, { markDirty: false });
      await refreshDocs();
      return;
    }
    if (target === 'append') {
      const next = editor.content.trimEnd() + '\n\n' + trimmed + '\n';
      editor.setContent(next, { markDirty: true });
      return;
    }
    if (target === 'replace') {
      editor.setContent(trimmed, { markDirty: true });
      return;
    }
  };

  const cancel = async (): Promise<void> => {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    jobIdRef.current = null;
    try {
      await window.api.aiCli.cancel(jobId);
    } catch {
      // ignore — main might have already cleaned up
    }
    if (phase.kind === 'generating') {
      setPhase({ kind: 'form', source: phase.source });
    }
  };

  const handleOpenChange = (next: boolean): void => {
    if (next) return;
    if (phase.kind === 'generating') {
      // Confirm before throwing away an in-flight generation.
      if (!confirm('Cancel the running generation?')) return;
      void cancel();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Generate from reader
          </DialogTitle>
          <DialogDescription>
            Reads the active reader pane and asks Claude (via the local CLI) to draft a Markdown
            artifact in the style and template you choose.
          </DialogDescription>
        </DialogHeader>

        {phase.kind === 'loading-source' && (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Extracting reader content…
          </div>
        )}

        {phase.kind === 'source-error' && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-medium">Couldn&rsquo;t read the active tab</div>
              <div className="mt-0.5 opacity-80">{phase.message}</div>
            </div>
          </div>
        )}

        {(phase.kind === 'form' || phase.kind === 'error' || phase.kind === 'generating') && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="blog-style">Style</Label>
                <select
                  id="blog-style"
                  value={styleId}
                  onChange={(e) => setStyleId(e.target.value)}
                  disabled={phase.kind === 'generating'}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.builtIn ? '' : ' (custom)'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">{style.description}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="blog-template">Template</Label>
                <select
                  id="blog-template"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={phase.kind === 'generating'}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.builtIn ? '' : ' (custom)'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">{template.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <div className="flex gap-1 rounded-md border border-input p-0.5">
                  {(['zh', 'en'] as const).map((l) => (
                    <Button
                      key={l}
                      type="button"
                      variant={language === l ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      onClick={() => setLanguage(l)}
                      disabled={phase.kind === 'generating'}
                    >
                      {l === 'zh' ? '中文' : 'English'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Length</Label>
                <div className="flex gap-1 rounded-md border border-input p-0.5">
                  {(['short', 'medium', 'long'] as const).map((l) => (
                    <Button
                      key={l}
                      type="button"
                      variant={length === l ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 flex-1 text-xs capitalize"
                      onClick={() => setLength(l)}
                      disabled={phase.kind === 'generating'}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Output</Label>
              <div className="grid grid-cols-3 gap-1 rounded-md border border-input p-0.5">
                {(
                  [
                    ['new-doc', 'New doc'],
                    ['append', 'Append'],
                    ['replace', 'Replace'],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    type="button"
                    variant={outputTarget === id ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setOutputTarget(id)}
                    disabled={phase.kind === 'generating'}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {outputTarget === 'new-doc'
                  ? 'Creates a new document in the active workspace.'
                  : outputTarget === 'append'
                    ? 'Appends to the bottom of the current document.'
                    : 'Replaces the current document’s contents.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blog-extra">Extra instructions (optional)</Label>
              <textarea
                id="blog-extra"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={2}
                placeholder="e.g. include a TL;DR up top; title should be a question"
                disabled={phase.kind === 'generating'}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {(phase.kind === 'form' || phase.kind === 'generating') && (
              <SourcePreview source={phase.source} />
            )}

            {phase.kind === 'generating' && (
              <div className="space-y-1.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    Generating with Claude…{' '}
                    {phase.progress.chars > 0 ? (
                      <span className="font-mono text-foreground">
                        {phase.progress.chars.toLocaleString()} chars
                      </span>
                    ) : (
                      <span className="opacity-70">waiting for first output…</span>
                    )}
                  </span>
                </div>
                {phase.progress.tail && (
                  <div className="line-clamp-2 break-words font-mono text-[10px] text-muted-foreground/80">
                    …{phase.progress.tail}
                  </div>
                )}
              </div>
            )}

            {phase.kind === 'error' && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="break-words">{phase.message}</div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {phase.kind === 'generating' ? (
            <Button variant="outline" onClick={cancel}>
              Cancel generation
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={startGeneration}
                disabled={phase.kind !== 'form' && phase.kind !== 'error'}
              >
                {phase.kind === 'error' ? 'Retry' : 'Generate'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourcePreview({ source }: { source: ExtractedSource }): JSX.Element {
  const charCount = source.text.length;
  return (
    <div className="space-y-1 rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 text-[11px]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="rounded bg-background px-1.5 py-0.5 font-mono uppercase tracking-wider">
          {source.kind}
        </span>
        <span className="truncate font-medium">{source.title}</span>
      </div>
      <div className="truncate font-mono text-[10px] text-muted-foreground">{source.source}</div>
      <div className="text-[10px] text-muted-foreground">
        Extracted {charCount.toLocaleString()} characters
        {charCount > 50_000 && ' — will be truncated to 50,000 for the prompt'}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
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
import { Cloud, Folder, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace';
import { useEditorStore } from '@/stores/editor';
import { useT, t as tImperative } from '@/i18n';
import { cn } from '@/lib/utils';

interface SuggestedParent {
  path: string;
  label: string;
  exists: boolean;
  hint?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

/**
 * Strip a trailing path separator and return the parent directory of `p`.
 * Empty input returns empty. The result never has a trailing slash.
 */
function dirnameOf(p: string): string {
  const trimmed = p.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return trimmed; // either no slash or root "/"
  return trimmed.slice(0, idx);
}

/**
 * Name-first workspace creation. Auto-defaults the parent folder to the
 * sibling of the currently active workspace so new workspaces sit next to
 * the existing ones (typically inside the iCloud "ReadWrite Notes" folder).
 * "Custom location…" reveals a path picker for users who want to override.
 */
export function CreateWorkspaceDialog({ open, onOpenChange }: Props): JSX.Element {
  const t = useT();
  const active = useWorkspaceStore((s) => s.active);
  const create = useWorkspaceStore((s) => s.create);

  const defaultParent = useMemo(() => (active ? dirnameOf(active) : ''), [active]);
  const [name, setName] = useState('');
  const [parent, setParent] = useState(defaultParent);
  const [showCustom, setShowCustom] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedParent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state every time the dialog (re)opens, and lazily
  // fetch the suggested parents — only needed when the user opens
  // "Custom location" without an active workspace to inherit from.
  useEffect(() => {
    if (!open) return;
    setName('');
    setError(null);
    setBusy(false);
    setShowCustom(false);
    setParent(defaultParent);
    if (suggested.length === 0) {
      window.api.workspace
        .getSuggestedParents()
        .then((list) => {
          setSuggested(list);
          if (!defaultParent) {
            const cloud = list.find((p) => p.label === 'iCloud Drive' && p.exists) ?? list[0];
            if (cloud) setParent(cloud.path);
          }
        })
        .catch(() => null);
    }
    // We intentionally only re-run on `open`/`defaultParent`; the rest are
    // setters that don't change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultParent]);

  const effectiveParent = (parent || defaultParent || '').replace(/\/+$/, '');
  const previewName = name.trim() || t('workspace.create.namePlaceholder');
  const previewPath = effectiveParent ? `${effectiveParent}/${previewName}` : previewName;

  const onSubmit = async (): Promise<void> => {
    setError(null);
    if (!name.trim()) {
      setError(t('workspace.create.errorRequired'));
      return;
    }
    if (!effectiveParent) {
      setError(t('workspace.create.errorParentRequired'));
      return;
    }
    if (useEditorStore.getState().dirty && !confirm(tImperative('common.discardUnsavedChanges'))) {
      return;
    }
    setBusy(true);
    try {
      await create(effectiveParent, name.trim());
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const browse = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: t('workspace.dialog.pickParent'),
    });
    if (!paths || paths.length === 0) return;
    setParent(paths[0]!);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('workspace.create.title')}</DialogTitle>
          <DialogDescription>{t('workspace.create.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">{t('workspace.create.nameLabel')}</Label>
            <Input
              id="ws-name"
              value={name}
              autoFocus
              placeholder={t('workspace.create.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) onSubmit();
              }}
            />
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('workspace.create.willBeCreatedAt')}</span>
              {!showCustom && defaultParent && (
                <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {t('workspace.create.locationDefault')}
                </span>
              )}
            </div>
            <div className="truncate pt-1 font-mono">{previewPath}</div>
          </div>

          <button
            type="button"
            className="text-xs text-primary underline-offset-2 hover:underline"
            onClick={() => setShowCustom((v) => !v)}
          >
            {showCustom
              ? t('workspace.create.customLocationHide')
              : t('workspace.create.customLocationToggle')}
          </button>

          {showCustom && (
            <div className="space-y-3 rounded-md border border-dashed border-border p-3">
              {suggested.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('workspace.create.suggestedTitle')}</Label>
                  <div className="grid gap-1.5">
                    {suggested.map((s) => (
                      <button
                        key={s.path}
                        type="button"
                        disabled={!s.exists}
                        onClick={() => setParent(s.path)}
                        className={cn(
                          'flex items-start gap-2 rounded border px-2.5 py-1.5 text-left text-xs transition-colors',
                          parent === s.path
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:border-primary/40',
                          !s.exists && 'cursor-not-allowed opacity-40',
                        )}
                      >
                        {s.label === 'iCloud Drive' ? (
                          <Cloud className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                        ) : (
                          <Folder className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            {s.label}
                            {!s.exists && ` ${t('workspace.create.notAvailable')}`}
                          </div>
                          <div className="truncate font-mono text-[10px] text-muted-foreground">
                            {s.path}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ws-parent" className="text-xs">
                  {t('workspace.create.parentLabel')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ws-parent"
                    className="flex-1 font-mono text-xs"
                    value={parent}
                    onChange={(e) => setParent(e.target.value)}
                  />
                  <Button variant="outline" size="sm" onClick={browse}>
                    <FolderOpen className="mr-2 h-3.5 w-3.5" />
                    {t('common.browse')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={busy || !name.trim()}>
            {busy ? t('common.creating') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

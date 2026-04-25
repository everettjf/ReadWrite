import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, Folder, FolderOpen, FolderPlus, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from './stores/workspace';
import { cn } from './lib/utils';

interface SuggestedParent {
  path: string;
  label: string;
  exists: boolean;
  hint?: string;
}

/**
 * Full-window onboarding shown when there is no active workspace
 * (first launch, or after the active workspace was forgotten / deleted).
 */
export function WorkspacePicker(): JSX.Element {
  const known = useWorkspaceStore((s) => s.known);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const create = useWorkspaceStore((s) => s.create);

  const [mode, setMode] = useState<'home' | 'create' | 'open'>('home');
  const [suggested, setSuggested] = useState<SuggestedParent[]>([]);
  const [parent, setParent] = useState<string>('');
  const [name, setName] = useState('My Notes');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.api.workspace
      .getSuggestedParents()
      .then((list) => {
        setSuggested(list);
        const cloudOrFirst = list.find((p) => p.label === 'iCloud Drive' && p.exists) ?? list[0];
        if (cloudOrFirst) setParent(cloudOrFirst.path);
      })
      .catch(() => null);
  }, []);

  const onPickExisting = async (): Promise<void> => {
    setError(null);
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Choose your ReadWrite workspace',
    });
    if (!paths || paths.length === 0) return;
    setBusy(true);
    try {
      await setActive(paths[0]!);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async (): Promise<void> => {
    setError(null);
    if (!parent.trim() || !name.trim()) {
      setError('Pick a parent location and give the workspace a name.');
      return;
    }
    setBusy(true);
    try {
      await create(parent.trim(), name.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const browseParent = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Pick a parent folder for the new workspace',
    });
    if (!paths || paths.length === 0) return;
    setParent(paths[0]!);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome to ReadWrite</h1>
          <p className="text-sm text-muted-foreground">
            A workspace is a folder where every document gets its own subfolder. Pick one to start —
            you can switch or add more anytime.
          </p>
        </header>

        {mode === 'home' && (
          <div className="space-y-3">
            <ChoiceRow
              icon={FolderPlus}
              title="Create a new workspace"
              description="Recommended for first-time users. We'll suggest iCloud Drive on macOS."
              onClick={() => setMode('create')}
            />
            <ChoiceRow
              icon={FolderOpen}
              title="Open an existing folder"
              description="Already have a folder of notes? Point ReadWrite at it."
              onClick={onPickExisting}
            />
            {known.length > 0 && (
              <div className="pt-4">
                <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent workspaces
                </h2>
                <div className="space-y-1">
                  {known.map((w) => (
                    <button
                      key={w.path}
                      onClick={() => setActive(w.path)}
                      className="flex w-full items-center gap-3 rounded-md border border-transparent bg-muted/40 px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/70"
                    >
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{w.name}</div>
                        <div className="truncate font-mono text-[10px] text-muted-foreground">
                          {w.path}
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-5 rounded-lg border border-border bg-muted/20 p-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">Where should the workspace live?</h2>
              <p className="text-xs text-muted-foreground">
                Pick a parent location. iCloud Drive is the easiest way to keep your notes synced
                across Macs.
              </p>
            </div>

            <div className="grid gap-2">
              {suggested.map((s) => (
                <button
                  key={s.path}
                  type="button"
                  disabled={!s.exists}
                  onClick={() => setParent(s.path)}
                  className={cn(
                    'flex items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    parent === s.path
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/40',
                    !s.exists && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {s.label === 'iCloud Drive' ? (
                    <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  ) : (
                    <Folder className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {s.label}
                      {!s.exists && ' (not available)'}
                    </div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {s.path}
                    </div>
                    {s.hint && <div className="text-[10px] text-muted-foreground">{s.hint}</div>}
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parent">Or paste a custom location</Label>
              <div className="flex gap-2">
                <Input
                  id="parent"
                  className="flex-1 font-mono text-xs"
                  value={parent}
                  onChange={(e) => setParent(e.target.value)}
                />
                <Button variant="outline" onClick={browseParent}>
                  <FolderOpen className="mr-2 h-4 w-4" /> Browse
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Notes"
              />
              <p className="text-[10px] text-muted-foreground">
                Will be created as{' '}
                <span className="font-mono">
                  {parent.replace(/\/+$/, '') || '<parent>'}/{name || 'My Notes'}
                </span>
                .
              </p>
            </div>

            {error && (
              <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setMode('home')} disabled={busy}>
                Back
              </Button>
              <Button onClick={onCreate} disabled={busy || !parent.trim() || !name.trim()}>
                {busy ? 'Creating…' : 'Create workspace'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChoiceRow({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/60 hover:bg-muted/40"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

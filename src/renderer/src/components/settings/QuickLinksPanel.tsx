import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { Section } from './Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, RotateCcw } from 'lucide-react';
import type { QuickLink } from '@shared/types';

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: 'github-trending', name: 'GitHub Trending', url: 'https://github.com/trending' },
  { id: 'hacker-news', name: 'Hacker News', url: 'https://news.ycombinator.com' },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com' },
  { id: 'product-hunt', name: 'Product Hunt', url: 'https://www.producthunt.com' },
  { id: 'hugging-face', name: 'Hugging Face', url: 'https://huggingface.co' },
];

export function QuickLinksPanel(): JSX.Element {
  const quickLinks = useSettingsStore((s) => s.quickLinks);
  const update = useSettingsStore((s) => s.update);

  const [draft, setDraft] = useState<QuickLink[]>(quickLinks);
  const [dirty, setDirty] = useState(false);

  const persistedKey = quickLinks.map((l) => `${l.id}:${l.name}:${l.url}`).join('|');
  const draftKey = draft.map((l) => `${l.id}:${l.name}:${l.url}`).join('|');
  if (!dirty && persistedKey !== draftKey) {
    setDraft(quickLinks);
  }

  const patch = (id: string, p: Partial<QuickLink>): void => {
    setDraft((prev) => prev.map((l) => (l.id === id ? { ...l, ...p } : l)));
    setDirty(true);
  };

  const remove = (id: string): void => {
    setDraft((prev) => prev.filter((l) => l.id !== id));
    setDirty(true);
  };

  const add = (): void => {
    const id = `link-${Date.now().toString(36)}`;
    setDraft((prev) => [...prev, { id, name: '', url: '' }]);
    setDirty(true);
  };

  const move = (id: string, delta: -1 | 1): void => {
    setDraft((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const next = idx + delta;
      if (idx === -1 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next]!, copy[idx]!];
      return copy;
    });
    setDirty(true);
  };

  const save = async (): Promise<void> => {
    const cleaned = draft
      .map((l) => ({ ...l, name: l.name.trim(), url: l.url.trim() }))
      .filter((l) => l.name && l.url);
    await update({ quickLinks: cleaned });
    setDirty(false);
  };

  const revert = (): void => {
    setDraft(quickLinks);
    setDirty(false);
  };

  const restoreDefaults = (): void => {
    setDraft(DEFAULT_QUICK_LINKS);
    setDirty(true);
  };

  return (
    <Section title="Quick Links">
      <div className="space-y-2 py-3">
        <p className="text-xs text-muted-foreground">
          Shortcuts shown on the reader empty state. Name and URL are both required.
        </p>

        {draft.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-xs text-muted-foreground">
            No quick links. Add one below or restore the defaults.
          </div>
        )}

        <div className="space-y-1.5">
          {draft.map((link, i) => (
            <div key={link.id} className="flex items-center gap-1.5">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-3.5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => move(link.id, -1)}
                  disabled={i === 0}
                  title="Move up"
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-3.5 w-5 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => move(link.id, 1)}
                  disabled={i === draft.length - 1}
                  title="Move down"
                >
                  <GripVertical className="h-3 w-3 -rotate-90" />
                </Button>
              </div>
              <Input
                value={link.name}
                onChange={(e) => patch(link.id, { name: e.target.value })}
                placeholder="Name"
                className="w-40"
              />
              <Input
                value={link.url}
                onChange={(e) => patch(link.id, { url: e.target.value })}
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => remove(link.id)}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={add}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add link
            </Button>
            <Button variant="ghost" size="sm" onClick={restoreDefaults}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore defaults
            </Button>
          </div>
          {dirty && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={revert}>
                Revert
              </Button>
              <Button size="sm" onClick={save}>
                Save changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

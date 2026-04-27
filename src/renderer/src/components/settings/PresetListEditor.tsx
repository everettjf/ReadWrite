import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { AIPresetEntry } from '@shared/types';

interface PresetListEditorProps {
  /** Current user-defined entries (does not include built-ins). */
  entries: AIPresetEntry[];
  /** Persists the new full list. */
  onChange: (next: AIPresetEntry[]) => void;
  /** Singular label, e.g. "style" or "template" — used in placeholder text. */
  kindLabel: string;
}

/**
 * CRUD list for user-defined AI presets (styles or templates).
 * Built-ins live in the renderer code and aren't editable here — this
 * component only handles the user-extension layer.
 *
 * Each entry is editable inline. Changes commit on field blur or via
 * an explicit Save (kept simple: changes reflect immediately, but the
 * single Save call below the list flushes to settings to avoid a write
 * per keystroke).
 */
export function PresetListEditor({
  entries,
  onChange,
  kindLabel,
}: PresetListEditorProps): JSX.Element {
  const [draft, setDraft] = useState<AIPresetEntry[]>(entries);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Re-seed draft when the persisted list changes from outside.
  const persistedKey = entries.map((e) => e.id).join('|');
  const draftKey = draft.map((e) => e.id).join('|');
  if (!dirty && persistedKey !== draftKey) {
    setDraft(entries);
  }

  const update = (id: string, patch: Partial<AIPresetEntry>): void => {
    setDraft((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setDirty(true);
  };

  const remove = (id: string): void => {
    setDraft((prev) => prev.filter((e) => e.id !== id));
    setDirty(true);
  };

  const add = (): void => {
    const id = `custom-${Date.now().toString(36)}`;
    const fresh: AIPresetEntry = {
      id,
      name: `My ${kindLabel}`,
      description: '',
      systemPrompt: '',
    };
    setDraft((prev) => [...prev, fresh]);
    setExpandedId(id);
    setDirty(true);
  };

  const save = (): void => {
    onChange(draft);
    setDirty(false);
  };

  const revert = (): void => {
    setDraft(entries);
    setDirty(false);
  };

  return (
    <div className="space-y-2">
      {draft.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-xs text-muted-foreground">
          No custom {kindLabel}s yet. Click below to add one.
        </div>
      )}

      {draft.map((entry) => {
        const isOpen = expandedId === entry.id;
        return (
          <div key={entry.id} className="rounded-md border border-border bg-background">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setExpandedId(isOpen ? null : entry.id)}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{entry.name || '(unnamed)'}</div>
                {entry.description && (
                  <div className="truncate text-[10px] text-muted-foreground">
                    {entry.description}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                onClick={() => remove(entry.id)}
                title={`Remove this ${kindLabel}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {isOpen && (
              <div className="space-y-3 border-t border-border px-3 py-3">
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor={`name-${entry.id}`}>
                    Name
                  </Label>
                  <Input
                    id={`name-${entry.id}`}
                    value={entry.name}
                    onChange={(e) => update(entry.id, { name: e.target.value })}
                    placeholder={`My ${kindLabel}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor={`desc-${entry.id}`}>
                    Short description
                  </Label>
                  <Input
                    id={`desc-${entry.id}`}
                    value={entry.description}
                    onChange={(e) => update(entry.id, { description: e.target.value })}
                    placeholder="A one-liner shown in the dropdown"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor={`prompt-${entry.id}`}>
                    System prompt fragment
                  </Label>
                  <textarea
                    id={`prompt-${entry.id}`}
                    value={entry.systemPrompt}
                    onChange={(e) => update(entry.id, { systemPrompt: e.target.value })}
                    rows={6}
                    placeholder={`Describe how Claude should behave for this ${kindLabel}.`}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add custom {kindLabel}
        </Button>
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
  );
}

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { Section, Field } from './Field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppSettings } from '@shared/types';
import { FolderOpen } from 'lucide-react';

export function EditorPanel(): JSX.Element {
  const editorFontSize = useSettingsStore((s) => s.editorFontSize);
  const editorFontFamily = useSettingsStore((s) => s.editorFontFamily);
  const editorMaxWidth = useSettingsStore((s) => s.editorMaxWidth);
  const editorMode = useSettingsStore((s) => s.editorMode);
  const workspaceRoot = useSettingsStore((s) => s.workspaceRoot ?? '');
  const autosaveDebounceMs = useSettingsStore((s) => s.autosaveDebounceMs);
  const update = useSettingsStore((s) => s.update);

  const [defaultRoot, setDefaultRoot] = useState<string>('');
  useEffect(() => {
    window.api.workspace
      .getDefaultRoot()
      .then(setDefaultRoot)
      .catch(() => null);
  }, []);

  const pickWorkspaceRoot = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Choose workspace folder',
    });
    if (!paths || paths.length === 0) return;
    await update({ workspaceRoot: paths[0]! });
  };

  return (
    <div className="space-y-8">
      <Section title="Workspace">
        <Field
          label="Workspace folder"
          description="Each new document gets its own subfolder here. Move the workspace folder anywhere — image links inside use relative paths and travel with their docs."
          htmlFor="workspaceRoot"
        >
          <div className="flex gap-2">
            <Input
              id="workspaceRoot"
              className="flex-1 font-mono text-xs"
              value={workspaceRoot}
              onChange={(e) => update({ workspaceRoot: e.target.value })}
              placeholder={defaultRoot}
            />
            <Button variant="outline" onClick={pickWorkspaceRoot}>
              <FolderOpen className="mr-2 h-4 w-4" /> Browse
            </Button>
          </div>
        </Field>

        <Field
          label="Autosave"
          description="Saves the active document this many milliseconds after the last edit. 0 disables autosave entirely."
          htmlFor="autosave"
          inline
        >
          <Input
            id="autosave"
            type="number"
            min={0}
            max={60000}
            step={250}
            className="w-28"
            value={autosaveDebounceMs}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v) && v >= 0 && v <= 60000) {
                update({ autosaveDebounceMs: v });
              }
            }}
          />
        </Field>
      </Section>

      <Section title="Editor">
        <Field
          label="Default mode"
          description="Which view to open new documents in."
          htmlFor="defaultMode"
        >
          <Select
            value={editorMode}
            onValueChange={(v) => update({ editorMode: v as AppSettings['editorMode'] })}
          >
            <SelectTrigger id="defaultMode" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wysiwyg">WYSIWYG</SelectItem>
              <SelectItem value="source">Source</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Font family" htmlFor="fontFamily">
          <Select
            value={editorFontFamily}
            onValueChange={(v) =>
              update({ editorFontFamily: v as AppSettings['editorFontFamily'] })
            }
          >
            <SelectTrigger id="fontFamily" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sans">Sans-serif (Inter)</SelectItem>
              <SelectItem value="serif">Serif (Georgia)</SelectItem>
              <SelectItem value="mono">Monospace (JetBrains Mono)</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Font size"
          description="Applies to both WYSIWYG and source modes."
          htmlFor="fontSize"
        >
          <Input
            id="fontSize"
            type="number"
            min={10}
            max={32}
            step={1}
            className="w-32"
            value={editorFontSize}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v) && v >= 10 && v <= 32) update({ editorFontSize: v });
            }}
          />
        </Field>

        <Field
          label="Content max width (px)"
          description="How wide the prose column gets before margins kick in."
          htmlFor="maxWidth"
        >
          <Input
            id="maxWidth"
            type="number"
            min={480}
            max={1400}
            step={20}
            className="w-32"
            value={editorMaxWidth}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v) && v >= 480 && v <= 1400) update({ editorMaxWidth: v });
            }}
          />
        </Field>
      </Section>
    </div>
  );
}

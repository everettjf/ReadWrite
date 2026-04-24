import { useSettingsStore } from '@/stores/settings';
import { Section, Field } from './Field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppSettings } from '@shared/types';

export function EditorPanel(): JSX.Element {
  const editorFontSize = useSettingsStore((s) => s.editorFontSize);
  const editorFontFamily = useSettingsStore((s) => s.editorFontFamily);
  const editorMaxWidth = useSettingsStore((s) => s.editorMaxWidth);
  const editorMode = useSettingsStore((s) => s.editorMode);
  const update = useSettingsStore((s) => s.update);

  return (
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
          onValueChange={(v) => update({ editorFontFamily: v as AppSettings['editorFontFamily'] })}
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
  );
}

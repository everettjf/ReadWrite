import { useSettingsStore } from '@/stores/settings';
import { useT } from '@/i18n';
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
  const t = useT();
  const editorFontSize = useSettingsStore((s) => s.editorFontSize);
  const editorFontFamily = useSettingsStore((s) => s.editorFontFamily);
  const editorMaxWidth = useSettingsStore((s) => s.editorMaxWidth);
  const editorMode = useSettingsStore((s) => s.editorMode);
  const autosaveDebounceMs = useSettingsStore((s) => s.autosaveDebounceMs);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="space-y-8">
      <Section title={t('settings.editor.title')}>
        <Field
          label={t('settings.editor.defaultMode.label')}
          description={t('settings.editor.defaultMode.description')}
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
              <SelectItem value="wysiwyg">{t('settings.editor.defaultMode.wysiwyg')}</SelectItem>
              <SelectItem value="source">{t('settings.editor.defaultMode.source')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={t('settings.editor.fontFamily.label')} htmlFor="fontFamily">
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
              <SelectItem value="sans">{t('settings.editor.fontFamily.sans')}</SelectItem>
              <SelectItem value="serif">{t('settings.editor.fontFamily.serif')}</SelectItem>
              <SelectItem value="mono">{t('settings.editor.fontFamily.mono')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label={t('settings.editor.fontSize.label')}
          description={t('settings.editor.fontSize.description')}
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
          label={t('settings.editor.maxWidth.label')}
          description={t('settings.editor.maxWidth.description')}
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

        <Field
          label={t('settings.editor.autosave.label')}
          description={t('settings.editor.autosave.description')}
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
    </div>
  );
}

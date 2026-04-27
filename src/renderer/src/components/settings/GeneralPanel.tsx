import { useSettingsStore } from '@/stores/settings';
import { useT } from '@/i18n';
import { Section, Field } from './Field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppSettings } from '@shared/types';

export function GeneralPanel(): JSX.Element {
  const t = useT();
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const update = useSettingsStore((s) => s.update);

  return (
    <Section title={t('settings.general.title')}>
      <Field
        label={t('settings.general.appearance.label')}
        description={t('settings.general.appearance.description')}
        htmlFor="theme"
      >
        <Select value={theme} onValueChange={(v) => update({ theme: v as AppSettings['theme'] })}>
          <SelectTrigger id="theme" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{t('settings.general.appearance.system')}</SelectItem>
            <SelectItem value="light">{t('settings.general.appearance.light')}</SelectItem>
            <SelectItem value="dark">{t('settings.general.appearance.dark')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field
        label={t('settings.general.language.label')}
        description={t('settings.general.language.description')}
        htmlFor="language"
      >
        <Select
          value={language}
          onValueChange={(v) => update({ language: v as AppSettings['language'] })}
        >
          <SelectTrigger id="language" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{t('settings.general.language.system')}</SelectItem>
            <SelectItem value="en">{t('settings.general.language.en')}</SelectItem>
            <SelectItem value="zh">{t('settings.general.language.zh')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </Section>
  );
}

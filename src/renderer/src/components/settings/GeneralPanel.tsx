import { useSettingsStore } from '@/stores/settings';
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
  const theme = useSettingsStore((s) => s.theme);
  const update = useSettingsStore((s) => s.update);

  return (
    <Section title="General">
      <Field
        label="Appearance"
        description="Match your OS, or override per-window."
        htmlFor="theme"
      >
        <Select value={theme} onValueChange={(v) => update({ theme: v as AppSettings['theme'] })}>
          <SelectTrigger id="theme" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </Section>
  );
}

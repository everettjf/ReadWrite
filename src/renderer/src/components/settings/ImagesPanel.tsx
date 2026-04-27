import { useSettingsStore } from '@/stores/settings';
import { useT } from '@/i18n';
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
import type { ImagesDirMode } from '@shared/types';
import { FolderOpen } from 'lucide-react';

export function ImagesPanel(): JSX.Element {
  const t = useT();
  const mode = useSettingsStore((s) => s.imagesDirMode);
  const custom = useSettingsStore((s) => s.imagesDirCustom ?? '');
  const subfolder = useSettingsStore((s) => s.imagesDirSubfolderName);
  const update = useSettingsStore((s) => s.update);

  const pickCustomDir = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: t('settings.images.dialog.pick'),
    });
    if (!paths || paths.length === 0) return;
    await update({ imagesDirCustom: paths[0]!, imagesDirMode: 'custom' });
  };

  return (
    <Section title={t('settings.images.title')}>
      <Field
        label={t('settings.images.location.label')}
        description={t('settings.images.location.description')}
        htmlFor="imagesMode"
      >
        <Select value={mode} onValueChange={(v) => update({ imagesDirMode: v as ImagesDirMode })}>
          <SelectTrigger id="imagesMode" className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next-to-doc">{t('settings.images.location.nextToDoc')}</SelectItem>
            <SelectItem value="custom">{t('settings.images.location.custom')}</SelectItem>
            <SelectItem value="pictures">{t('settings.images.location.pictures')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field
        label={t('settings.images.subfolder.label')}
        description={t('settings.images.subfolder.description')}
        htmlFor="subfolder"
      >
        <Input
          id="subfolder"
          className="w-72"
          value={subfolder}
          onChange={(e) => update({ imagesDirSubfolderName: e.target.value })}
          placeholder="images"
        />
      </Field>

      <Field
        label={t('settings.images.custom.label')}
        description={t('settings.images.custom.description')}
        htmlFor="customDir"
      >
        <div className="flex gap-2">
          <Input
            id="customDir"
            className="flex-1"
            value={custom}
            onChange={(e) => update({ imagesDirCustom: e.target.value })}
            placeholder="/Users/you/Pictures/ReadWrite"
          />
          <Button variant="outline" onClick={pickCustomDir}>
            <FolderOpen className="mr-2 h-4 w-4" /> {t('common.browse')}
          </Button>
        </div>
      </Field>
    </Section>
  );
}

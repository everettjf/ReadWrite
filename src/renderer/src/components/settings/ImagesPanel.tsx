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
import type { ImagesDirMode } from '@shared/types';
import { FolderOpen } from 'lucide-react';

export function ImagesPanel(): JSX.Element {
  const mode = useSettingsStore((s) => s.imagesDirMode);
  const custom = useSettingsStore((s) => s.imagesDirCustom ?? '');
  const subfolder = useSettingsStore((s) => s.imagesDirSubfolderName);
  const update = useSettingsStore((s) => s.update);

  const pickCustomDir = async (): Promise<void> => {
    const paths = await window.api.fs.openDialog({
      directory: true,
      title: 'Choose image storage folder',
    });
    if (!paths || paths.length === 0) return;
    await update({ imagesDirCustom: paths[0]!, imagesDirMode: 'custom' });
  };

  return (
    <Section title="Images & Screenshots">
      <Field
        label="Storage location"
        description="Where the camera button writes captured PNGs."
        htmlFor="imagesMode"
      >
        <Select value={mode} onValueChange={(v) => update({ imagesDirMode: v as ImagesDirMode })}>
          <SelectTrigger id="imagesMode" className="w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next-to-doc">Next to current document (recommended)</SelectItem>
            <SelectItem value="custom">Custom absolute folder</SelectItem>
            <SelectItem value="pictures">User Pictures folder</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Subfolder name"
        description="Used by 'next to current document' mode. Inserted as a relative href so the markdown stays portable."
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
        label="Custom folder"
        description="Used by 'custom absolute folder' mode."
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
            <FolderOpen className="mr-2 h-4 w-4" /> Browse
          </Button>
        </div>
      </Field>
    </Section>
  );
}

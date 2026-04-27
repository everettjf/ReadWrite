import { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { Section, Field } from './Field';
import { Button } from '@/components/ui/button';

export function AboutPanel(): JSX.Element {
  const t = useT();
  const [version, setVersion] = useState<string>('—');

  useEffect(() => {
    window.api.app
      .getVersion()
      .then(setVersion)
      .catch(() => setVersion('?'));
  }, []);

  return (
    <Section title={t('settings.about.title')}>
      <Field label={t('settings.about.version')} inline>
        <span className="font-mono text-sm">{version}</span>
      </Field>
      <Field label={t('settings.about.license')} inline>
        <span className="text-sm">MIT</span>
      </Field>
      <Field label={t('settings.about.repository')} inline>
        <Button
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => window.api.shell.openExternal('https://github.com/everettjf/ReadWrite')}
        >
          github.com/everettjf/ReadWrite
        </Button>
      </Field>
      <Field label={t('settings.about.author')} inline>
        <Button
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => window.api.shell.openExternal('https://x.com/everettjf')}
          title={t('settings.about.followOnX')}
        >
          @everettjf
        </Button>
      </Field>
      <Field
        label={t('settings.about.tagline')}
        description={t('settings.about.taglineText')}
        inline
      >
        <span />
      </Field>
    </Section>
  );
}

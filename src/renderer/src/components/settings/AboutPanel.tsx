import { useEffect, useState } from 'react';
import { Section, Field } from './Field';
import { Button } from '@/components/ui/button';

export function AboutPanel(): JSX.Element {
  const [version, setVersion] = useState<string>('—');

  useEffect(() => {
    window.api.app
      .getVersion()
      .then(setVersion)
      .catch(() => setVersion('?'));
  }, []);

  return (
    <Section title="About ReadWrite">
      <Field label="Version" inline>
        <span className="font-mono text-sm">{version}</span>
      </Field>
      <Field label="License" inline>
        <span className="text-sm">MIT</span>
      </Field>
      <Field label="Repository" inline>
        <Button
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => window.api.shell.openExternal('https://github.com/everettjf/ReadWrite')}
        >
          github.com/everettjf/ReadWrite
        </Button>
      </Field>
      <Field label="Tagline" description="Read anything. Write anywhere." inline>
        <span />
      </Field>
    </Section>
  );
}

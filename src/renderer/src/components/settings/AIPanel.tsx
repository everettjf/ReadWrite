import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { Section, Field } from './Field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export function AIPanel(): JSX.Element {
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const aiEndpoint = useSettingsStore((s) => s.aiEndpoint);
  const aiApiKey = useSettingsStore((s) => s.aiApiKey);
  const aiModel = useSettingsStore((s) => s.aiModel);
  const aiSystemPrompt = useSettingsStore((s) => s.aiSystemPrompt);
  const update = useSettingsStore((s) => s.update);

  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const onTest = async (): Promise<void> => {
    setTesting(true);
    setTestStatus(null);
    try {
      const result = await window.api.ai.complete({
        input: 'Reply with only the word OK.',
        instruction: 'Respond with the literal text "OK" — no other text.',
      });
      setTestStatus({
        ok: true,
        msg: `Response: "${result.text.slice(0, 40)}" (model: ${result.model})`,
      });
    } catch (err) {
      setTestStatus({ ok: false, msg: (err as Error).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Section title="AI Assistant">
        <Field
          label="Enable AI features"
          description="When off, the editor's AI buttons are hidden and no requests are sent."
          inline
        >
          <Switch
            checked={aiEnabled}
            onCheckedChange={(checked) => update({ aiEnabled: checked })}
          />
        </Field>

        <Field
          label="API endpoint"
          description="OpenAI-compatible base URL. For Azure OpenAI / DeepSeek / Moonshot, use their respective endpoints."
          htmlFor="aiEndpoint"
        >
          <Input
            id="aiEndpoint"
            value={aiEndpoint}
            onChange={(e) => update({ aiEndpoint: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </Field>

        <Field
          label="API key"
          description="Stored locally in your app data SQLite database. Never sent anywhere except the endpoint above."
          htmlFor="aiApiKey"
        >
          <div className="flex gap-2">
            <Input
              id="aiApiKey"
              type={showKey ? 'text' : 'password'}
              value={aiApiKey}
              onChange={(e) => update({ aiApiKey: e.target.value })}
              placeholder="sk-..."
            />
            <Button variant="outline" size="sm" onClick={() => setShowKey((v) => !v)}>
              {showKey ? 'Hide' : 'Show'}
            </Button>
          </div>
        </Field>

        <Field label="Model" htmlFor="aiModel">
          <Input
            id="aiModel"
            value={aiModel}
            onChange={(e) => update({ aiModel: e.target.value })}
            placeholder="gpt-4o-mini"
            className="w-72"
          />
        </Field>

        <Field
          label="System prompt"
          description="Prepended to every request. Defines the assistant's voice and rules."
          htmlFor="aiSystem"
        >
          <textarea
            id="aiSystem"
            value={aiSystemPrompt}
            onChange={(e) => update({ aiSystemPrompt: e.target.value })}
            rows={5}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </Field>

        <Field label="Connection test" inline>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={onTest} disabled={testing || !aiEnabled || !aiApiKey}>
              {testing ? 'Testing…' : 'Send test request'}
            </Button>
            {testStatus && (
              <span
                className={testStatus.ok ? 'text-xs text-emerald-500' : 'text-xs text-destructive'}
              >
                {testStatus.msg}
              </span>
            )}
          </div>
        </Field>
      </Section>
    </div>
  );
}

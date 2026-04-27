import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { Section, Field } from './Field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { CliDetectResponse } from '@shared/types';

export function AIPanel(): JSX.Element {
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const aiEndpoint = useSettingsStore((s) => s.aiEndpoint);
  const aiApiKey = useSettingsStore((s) => s.aiApiKey);
  const aiModel = useSettingsStore((s) => s.aiModel);
  const aiSystemPrompt = useSettingsStore((s) => s.aiSystemPrompt);
  const aiCliProvider = useSettingsStore((s) => s.aiCliProvider);
  const aiCliClaudePath = useSettingsStore((s) => s.aiCliClaudePath);
  const aiCliCodexPath = useSettingsStore((s) => s.aiCliCodexPath);
  const update = useSettingsStore((s) => s.update);

  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const [cliDetecting, setCliDetecting] = useState(false);
  const [cliResult, setCliResult] = useState<CliDetectResponse | null>(null);

  const onDetectCli = async (): Promise<void> => {
    if (aiCliProvider === 'none') return;
    setCliDetecting(true);
    setCliResult(null);
    try {
      const result = await window.api.aiCli.detect({
        provider: aiCliProvider,
        pathOverride:
          aiCliProvider === 'claude-code'
            ? aiCliClaudePath
            : aiCliProvider === 'codex'
              ? aiCliCodexPath
              : undefined,
      });
      setCliResult(result);
    } catch (err) {
      setCliResult({ available: false, error: (err as Error).message });
    } finally {
      setCliDetecting(false);
    }
  };

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

      <Section title="External AI CLI (long-form generation)">
        <Field
          label="Provider"
          description="Used by long-running tasks like 'Generate from reader'. The short-form actions above (Polish/Translate/etc.) keep using the API."
          htmlFor="aiCliProvider"
        >
          <select
            id="aiCliProvider"
            value={aiCliProvider}
            onChange={(e) =>
              update({ aiCliProvider: e.target.value as 'none' | 'claude-code' | 'codex' })
            }
            className="flex h-9 w-72 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="none">Disabled</option>
            <option value="claude-code">Claude Code</option>
            <option value="codex">Codex (experimental)</option>
          </select>
        </Field>

        {aiCliProvider === 'claude-code' && (
          <Field
            label="Claude binary path (optional)"
            description={
              "Leave blank to look up `claude` on your shell PATH. Set an absolute path if it's installed somewhere unusual."
            }
            htmlFor="aiCliClaudePath"
          >
            <Input
              id="aiCliClaudePath"
              value={aiCliClaudePath ?? ''}
              onChange={(e) => update({ aiCliClaudePath: e.target.value })}
              placeholder="/usr/local/bin/claude"
            />
          </Field>
        )}

        {aiCliProvider === 'codex' && (
          <Field
            label="Codex binary path (optional)"
            description="Leave blank to look up `codex` on your shell PATH."
            htmlFor="aiCliCodexPath"
          >
            <Input
              id="aiCliCodexPath"
              value={aiCliCodexPath ?? ''}
              onChange={(e) => update({ aiCliCodexPath: e.target.value })}
              placeholder="/usr/local/bin/codex"
            />
          </Field>
        )}

        {aiCliProvider !== 'none' && (
          <Field label="Detection" inline>
            <div className="flex flex-col items-end gap-2">
              <Button onClick={onDetectCli} disabled={cliDetecting}>
                {cliDetecting ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Probing…
                  </>
                ) : (
                  'Detect CLI'
                )}
              </Button>
              {cliResult && (
                <div
                  className={`flex items-start gap-1.5 text-xs ${
                    cliResult.available ? 'text-emerald-500' : 'text-destructive'
                  }`}
                >
                  {cliResult.available ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <div className="flex flex-col text-right">
                    {cliResult.available ? (
                      <>
                        <span>Found: {cliResult.version ?? '(version not parsed)'}</span>
                        {cliResult.resolvedPath && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {cliResult.resolvedPath}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>{cliResult.error ?? 'Not available'}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>
        )}
      </Section>
    </div>
  );
}

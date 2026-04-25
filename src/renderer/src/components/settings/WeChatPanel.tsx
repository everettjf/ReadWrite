import { useState } from 'react';
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
import { WECHAT_THEMES } from '@/lib/wechat-themes';

export function WeChatPanel(): JSX.Element {
  const wechatAppId = useSettingsStore((s) => s.wechatAppId ?? '');
  const wechatAppSecret = useSettingsStore((s) => s.wechatAppSecret ?? '');
  const wechatExportTheme = useSettingsStore((s) => s.wechatExportTheme);
  const update = useSettingsStore((s) => s.update);

  const [showSecret, setShowSecret] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const onTest = async (): Promise<void> => {
    setTesting(true);
    setTestStatus(null);
    const result = await window.api.wechat.testCredentials();
    setTestStatus({ ok: result.ok, msg: result.message });
    setTesting(false);
  };

  return (
    <div className="space-y-8">
      <Section title="Copy to WeChat 公众号">
        <Field
          label="Export theme"
          description="Style preset applied when you use Editor → Copy to WeChat 公众号. Inline styles only — survives the WeChat editor's <style>-tag stripping."
          htmlFor="wechatTheme"
        >
          <Select value={wechatExportTheme} onValueChange={(v) => update({ wechatExportTheme: v })}>
            <SelectTrigger id="wechatTheme" className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WECHAT_THEMES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Credentials (for direct publishing)">
        <Field
          label="AppID"
          description="From your WeChat Official Account admin panel: 开发 → 基本配置."
          htmlFor="wxAppId"
        >
          <Input
            id="wxAppId"
            value={wechatAppId}
            onChange={(e) => update({ wechatAppId: e.target.value })}
            placeholder="wx..."
          />
        </Field>

        <Field
          label="AppSecret"
          description="Stored locally in your app data SQLite database."
          htmlFor="wxSecret"
        >
          <div className="flex gap-2">
            <Input
              id="wxSecret"
              type={showSecret ? 'text' : 'password'}
              value={wechatAppSecret}
              onChange={(e) => update({ wechatAppSecret: e.target.value })}
            />
            <Button variant="outline" size="sm" onClick={() => setShowSecret((v) => !v)}>
              {showSecret ? 'Hide' : 'Show'}
            </Button>
          </div>
        </Field>

        <Field label="Connection test" inline>
          <div className="flex flex-col items-end gap-2">
            <Button onClick={onTest} disabled={testing || !wechatAppId || !wechatAppSecret}>
              {testing ? 'Testing…' : 'Verify credentials'}
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

        <Field
          label="Direct publish from editor"
          description="Direct publish (upload images → create draft → push) is not implemented yet. Use 'Copy to WeChat 公众号' from the editor toolbar in the meantime."
          inline
        >
          <Button disabled variant="outline">
            Coming soon
          </Button>
        </Field>
      </Section>
    </div>
  );
}

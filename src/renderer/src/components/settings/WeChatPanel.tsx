import { useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { Section, Field } from './Field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function WeChatPanel(): JSX.Element {
  const wechatAppId = useSettingsStore((s) => s.wechatAppId ?? '');
  const wechatAppSecret = useSettingsStore((s) => s.wechatAppSecret ?? '');
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
    <Section title="WeChat 公众号">
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
        label="Publish from editor"
        description="Direct publish to drafts is not implemented yet. The credential surface here is the foundation for the upcoming publish flow."
        inline
      >
        <Button disabled variant="outline">
          Coming soon
        </Button>
      </Field>
    </Section>
  );
}

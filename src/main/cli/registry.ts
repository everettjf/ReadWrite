import type { AppSettings } from '@shared/types';
import { runClaudeOneShot } from './claude-code';

/**
 * Run the configured external CLI provider in one-shot mode (no
 * streaming). Picks claude-code or codex based on user settings;
 * forwards the optional binary path override.
 */
export async function runCliOneShot(
  prompt: string,
  settings: AppSettings,
  abortSignal?: AbortSignal,
): Promise<string> {
  const provider = settings.aiCliProvider;
  if (provider === 'none') {
    throw new Error(
      'External AI CLI is disabled. Pick a provider in Settings → AI CLI to use long-form generation.',
    );
  }
  if (provider === 'claude-code') {
    const result = await runClaudeOneShot(prompt, {
      pathOverride: settings.aiCliClaudePath,
      abortSignal,
    });
    return result.text;
  }
  if (provider === 'codex') {
    throw new Error('Codex provider is not implemented yet.');
  }
  throw new Error(`Unknown CLI provider: ${String(provider)}`);
}

import type { AppSettings } from '@shared/types';
import { runClaudeOneShot } from './claude-code';
import { runCodexOneShot } from './codex';
import { runGeminiOneShot } from './gemini';
import { runOpencodeOneShot } from './opencode';
import { runCustomOneShot } from './custom';
import type { CliProgressEvent } from './spawn-helper';

export type { CliProgressEvent };

export interface RunCliOpts {
  abortSignal?: AbortSignal;
  onProgress?: (event: CliProgressEvent) => void;
}

/**
 * Run the configured external CLI provider in one-shot mode (with
 * live progress events). Picks the right binary + flags based on
 * user settings; forwards the optional binary path override.
 *
 * Claude Code is the well-tested first-class provider. Codex / Gemini
 * / OpenCode are experimental — flag schemas have churned and the
 * runners use best-effort defaults; surfaced stderr is the user's
 * window into what's wrong if a flag isn't accepted on their version.
 * The 'custom' provider is the escape hatch.
 */
export async function runCliOneShot(
  prompt: string,
  settings: AppSettings,
  opts: RunCliOpts = {},
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
      abortSignal: opts.abortSignal,
      onProgress: opts.onProgress,
    });
    return result.text;
  }
  if (provider === 'codex') {
    const result = await runCodexOneShot(prompt, {
      pathOverride: settings.aiCliCodexPath,
      abortSignal: opts.abortSignal,
      onProgress: opts.onProgress,
    });
    return result.text;
  }
  if (provider === 'gemini') {
    const result = await runGeminiOneShot(prompt, {
      pathOverride: settings.aiCliGeminiPath,
      abortSignal: opts.abortSignal,
      onProgress: opts.onProgress,
    });
    return result.text;
  }
  if (provider === 'opencode') {
    const result = await runOpencodeOneShot(prompt, {
      pathOverride: settings.aiCliOpencodePath,
      abortSignal: opts.abortSignal,
      onProgress: opts.onProgress,
    });
    return result.text;
  }
  if (provider === 'custom') {
    const template = settings.aiCliCustomCommand ?? '';
    const result = await runCustomOneShot(prompt, template, {
      abortSignal: opts.abortSignal,
      onProgress: opts.onProgress,
    });
    return result.text;
  }
  throw new Error(`Unknown CLI provider: ${String(provider)}`);
}

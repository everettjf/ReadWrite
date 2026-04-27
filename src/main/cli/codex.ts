import { runCliProcess, type CliRunOptions, type CliRunResult } from './spawn-helper';

/**
 * Run OpenAI's Codex CLI in non-interactive mode.
 *
 * Assumed invocation: `codex exec --skip-git-repo-check "<prompt>"`.
 * The prompt is passed as a positional argv (codex exec does not yet
 * read prompts from stdin reliably across versions). We omit
 * `--sandbox` so the user's globally-configured sandbox policy applies
 * (codex defaults to read-only file access in exec mode).
 *
 * If the user is on an older codex that doesn't accept these flags,
 * stderr is surfaced clearly so they can adjust via the "Custom
 * command" provider.
 */
export async function runCodexOneShot(
  prompt: string,
  opts: CliRunOptions = {},
): Promise<CliRunResult> {
  const bin = opts.pathOverride && opts.pathOverride.trim() ? opts.pathOverride.trim() : 'codex';
  return runCliProcess(
    bin,
    ['exec', '--skip-git-repo-check'],
    prompt,
    { kind: 'argv', appendAs: 'last' },
    opts,
  );
}

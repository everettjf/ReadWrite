import { runCliProcess, type CliRunOptions, type CliRunResult } from './spawn-helper';

/**
 * Run opencode.ai's CLI in run/one-shot mode.
 *
 * Assumed invocation: `opencode run` with the prompt on stdin. Opencode's
 * `run` subcommand is the non-interactive one (vs. its TUI default).
 * If a future version diverges, the "Custom command" provider is the
 * escape hatch.
 */
export async function runOpencodeOneShot(
  prompt: string,
  opts: CliRunOptions = {},
): Promise<CliRunResult> {
  const bin = opts.pathOverride && opts.pathOverride.trim() ? opts.pathOverride.trim() : 'opencode';
  return runCliProcess(bin, ['run'], prompt, { kind: 'stdin' }, opts);
}

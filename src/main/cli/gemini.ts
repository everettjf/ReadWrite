import { runCliProcess, type CliRunOptions, type CliRunResult } from './spawn-helper';

/**
 * Run Google's Gemini CLI in print mode.
 *
 * Assumed invocation: `gemini -p` reading the prompt from stdin. The
 * `-p` flag puts gemini into a one-shot, non-interactive mode where
 * it prints the response to stdout and exits.
 *
 * Tool restriction is gemini's responsibility — its print mode is
 * non-agentic by default; we don't pass `--allowed-tools` because the
 * flag name has churned across versions. If a user reports tool use
 * in print mode, we'll add an explicit guard then.
 */
export async function runGeminiOneShot(
  prompt: string,
  opts: CliRunOptions = {},
): Promise<CliRunResult> {
  const bin = opts.pathOverride && opts.pathOverride.trim() ? opts.pathOverride.trim() : 'gemini';
  return runCliProcess(bin, ['-p'], prompt, { kind: 'stdin' }, opts);
}

import { runCliProcess, type CliRunOptions, type CliRunResult } from './spawn-helper';

/**
 * Run a user-supplied command template. Escape hatch for users on
 * CLIs we don't natively support, or for unusual flag combinations.
 *
 * Template shapes:
 *   - "/path/to/bin --flag1 --flag2"
 *       Whitespace-split into argv. Prompt is sent on stdin.
 *   - "/path/to/bin --flag {prompt}"
 *       The literal token `{prompt}` is replaced with the prompt
 *       (passed as one argv element). stdin is closed empty.
 *
 * No shell parsing — paths with spaces aren't supported. Users with
 * unusual setups can wrap their command in a small shell script and
 * point this template at it.
 */
export async function runCustomOneShot(
  prompt: string,
  template: string,
  opts: CliRunOptions = {},
): Promise<CliRunResult> {
  const trimmed = template.trim();
  if (!trimmed) {
    throw new Error('Custom CLI command is empty. Set the command template in Settings → AI CLI.');
  }
  const tokens = trimmed.split(/\s+/);
  const bin = tokens[0]!;
  const rest = tokens.slice(1);

  const placeholderIdx = rest.findIndex((t) => t === '{prompt}');
  if (placeholderIdx >= 0) {
    const args = [...rest];
    args[placeholderIdx] = prompt;
    return runCliProcess(bin, args, prompt, { kind: 'argv-prepared' }, opts);
  }
  return runCliProcess(bin, rest, prompt, { kind: 'stdin' }, opts);
}

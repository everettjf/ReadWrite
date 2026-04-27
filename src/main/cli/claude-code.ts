import { runCliProcess, type CliRunOptions, type CliRunResult } from './spawn-helper';

export type ClaudeProgressEvent =
  NonNullable<CliRunOptions['onProgress']> extends (e: infer E) => void ? E : never;

export type ClaudeRunOptions = CliRunOptions;
export type ClaudeRunResult = CliRunResult;

/**
 * Run Claude Code in print/no-tool mode and return its stdout.
 *
 * Safety: passes `--allowedTools ""` so the model has *no* tool access
 * (no Read, Edit, Bash, WebFetch …). The prompt may include untrusted
 * content scraped from the reader pane (web pages, PDFs); without
 * tools, prompt-injection at worst yields garbled output, never
 * filesystem or network side effects on the user's box.
 */
export async function runClaudeOneShot(
  prompt: string,
  opts: ClaudeRunOptions = {},
): Promise<ClaudeRunResult> {
  const bin = opts.pathOverride && opts.pathOverride.trim() ? opts.pathOverride.trim() : 'claude';
  return runCliProcess(
    bin,
    ['-p', '--output-format', 'text', '--allowedTools', ''],
    prompt,
    { kind: 'stdin' },
    opts,
  );
}

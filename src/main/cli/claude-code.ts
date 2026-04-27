import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { envWithPath } from './resolve-path';

export interface ClaudeProgressEvent {
  /** Total characters of generated output seen so far. */
  chars: number;
  /** A short tail of the most recent output for live preview. */
  tail: string;
}

export interface ClaudeRunOptions {
  /** Optional explicit path to the claude binary. */
  pathOverride?: string;
  /** Abort the run on signal. Kills the child process. */
  abortSignal?: AbortSignal;
  /** Fires on every stdout chunk so the UI can show live progress. */
  onProgress?: (event: ClaudeProgressEvent) => void;
}

export interface ClaudeRunResult {
  text: string;
  /** stderr captured during the run — surfaced in errors, useful for debugging. */
  stderrTail?: string;
}

/**
 * Run Claude Code in print/no-tool mode and return its stdout.
 *
 * Safety: we pass `--allowedTools ""` so the model has *no* tool access
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

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    let proc: ChildProcessWithoutNullStreams;
    try {
      proc = spawn(bin, ['-p', '--output-format', 'text', '--allowedTools', ''], {
        env: envWithPath(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      reject(new Error(`Failed to spawn ${bin}: ${(err as Error).message}`));
      return;
    }

    const onAbort = (): void => {
      if (settled) return;
      try {
        proc.kill('SIGTERM');
      } catch {
        // ignore
      }
      settled = true;
      reject(new Error('Generation canceled by user.'));
    };
    if (opts.abortSignal) {
      if (opts.abortSignal.aborted) {
        onAbort();
        return;
      }
      opts.abortSignal.addEventListener('abort', onAbort, { once: true });
    }

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
      if (opts.onProgress) {
        // Tail is throttled to last 200 chars so we don't drag the UI
        // when the output gets long.
        opts.onProgress({
          chars: stdout.length,
          tail: stdout.slice(-200),
        });
      }
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        reject(
          new Error(
            `${bin} not found on PATH. Run \`claude --version\` in your terminal to confirm it's installed, then set the path in Settings → AI CLI.`,
          ),
        );
      } else {
        reject(err);
      }
    });

    proc.on('close', (exitCode) => {
      if (settled) return;
      settled = true;
      if (exitCode === 0) {
        resolve({ text: stdout.trim(), stderrTail: stderr.trim().slice(-500) || undefined });
      } else {
        const detail = (stderr || stdout).trim().slice(0, 500);
        reject(
          new Error(`claude exited with code ${exitCode ?? '?'}${detail ? `: ${detail}` : ''}`),
        );
      }
    });

    // Pipe the prompt through stdin and close — claude -p reads stdin
    // when no positional prompt arg is given.
    try {
      proc.stdin.write(prompt);
      proc.stdin.end();
    } catch (err) {
      if (settled) return;
      settled = true;
      reject(new Error(`Failed to send prompt to claude: ${(err as Error).message}`));
    }
  });
}

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { envWithPath } from './resolve-path';

export interface CliProgressEvent {
  /** Text added since the previous event (one stdout chunk). */
  delta: string;
  /** Full text accumulated so far. */
  total: string;
  /** Total character count — kept for backwards compat / logging. */
  chars: number;
}

export interface CliRunOptions {
  /** Optional explicit path to the binary. */
  pathOverride?: string;
  /** Abort the run on signal. Kills the child process. */
  abortSignal?: AbortSignal;
  /** Fires on every stdout chunk so the UI can show live progress. */
  onProgress?: (event: CliProgressEvent) => void;
}

export interface CliRunResult {
  text: string;
  stderrTail?: string;
}

/** How to feed the prompt to the child process. */
export type PromptDelivery =
  /** Pipe prompt via stdin, then close. Args are used verbatim. */
  | { kind: 'stdin' }
  /** Append prompt as the last positional argument; close stdin empty. */
  | { kind: 'argv'; appendAs: 'last' }
  /** Args are pre-baked (already contain the prompt). Just close stdin empty. */
  | { kind: 'argv-prepared' };

/**
 * Generic "spawn a CLI, feed it a prompt, collect stdout" runner.
 * Centralizes:
 *   - PATH augmentation (so binaries installed via brew, cargo, npm-global
 *     etc. are reachable from the GUI process)
 *   - stdin or positional-arg prompt delivery
 *   - cancel via AbortSignal (SIGTERM)
 *   - progress events on each stdout chunk
 *   - clear errors on ENOENT / non-zero exit
 *
 * Each provider (claude-code, codex, gemini, opencode, custom) just
 * specifies the binary, args, and prompt-delivery mode.
 */
export async function runCliProcess(
  bin: string,
  baseArgs: string[],
  prompt: string,
  delivery: PromptDelivery,
  opts: CliRunOptions = {},
): Promise<CliRunResult> {
  const args = delivery.kind === 'argv' ? [...baseArgs, prompt] : [...baseArgs];
  const sendPromptOnStdin = delivery.kind === 'stdin';

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    let proc: ChildProcessWithoutNullStreams;
    try {
      proc = spawn(bin, args, {
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
      const delta = chunk.toString('utf8');
      stdout += delta;
      if (opts.onProgress) {
        opts.onProgress({ delta, total: stdout, chars: stdout.length });
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
            `${bin} not found on PATH. Run \`${bin} --version\` in your terminal to confirm it's installed, then set the path in Settings → AI CLI.`,
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
          new Error(`${bin} exited with code ${exitCode ?? '?'}${detail ? `: ${detail}` : ''}`),
        );
      }
    });

    if (sendPromptOnStdin) {
      try {
        proc.stdin.write(prompt);
        proc.stdin.end();
      } catch (err) {
        if (settled) return;
        settled = true;
        reject(new Error(`Failed to send prompt to ${bin}: ${(err as Error).message}`));
      }
    } else {
      // argv / argv-prepared — close stdin so the child doesn't wait on it.
      try {
        proc.stdin.end();
      } catch {
        // ignore
      }
    }
  });
}

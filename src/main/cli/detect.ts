import { spawn } from 'node:child_process';
import { envWithPath } from './resolve-path';

export type CliProvider = 'claude-code' | 'codex' | 'gemini' | 'opencode';

export interface CliDetectResult {
  available: boolean;
  /** Version string parsed from --version output, when available. */
  version?: string;
  /** Resolved binary path (or the user-supplied override). */
  resolvedPath?: string;
  /** Human-readable reason if not available. */
  error?: string;
}

const COMMAND_FOR: Record<CliProvider, string> = {
  'claude-code': 'claude',
  codex: 'codex',
  gemini: 'gemini',
  opencode: 'opencode',
};

/**
 * Probe a CLI by spawning `<bin> --version`. Returns availability +
 * version. Times out after 5s so a slow / hung binary doesn't block
 * the main process indefinitely.
 */
export async function detectCli(
  provider: CliProvider,
  pathOverride?: string,
): Promise<CliDetectResult> {
  const bin = pathOverride && pathOverride.trim() ? pathOverride.trim() : COMMAND_FOR[provider];

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result: CliDetectResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let proc;
    try {
      proc = spawn(bin, ['--version'], {
        env: envWithPath(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      finish({
        available: false,
        error: `Failed to spawn ${bin}: ${(err as Error).message}`,
      });
      return;
    }

    const timer = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {
        // ignore
      }
      finish({
        available: false,
        resolvedPath: bin,
        error: `${bin} --version timed out after 5s`,
      });
    }, 5000);

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      const isMissing =
        (err as NodeJS.ErrnoException).code === 'ENOENT' || /not found|ENOENT/i.test(err.message);
      finish({
        available: false,
        resolvedPath: bin,
        error: isMissing
          ? `${bin} not found on PATH. Install it, or set an explicit path in Settings → AI CLI.`
          : err.message,
      });
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        const version = (stdout || stderr).trim().split('\n')[0]?.trim();
        finish({
          available: true,
          version: version || undefined,
          resolvedPath: bin,
        });
      } else {
        finish({
          available: false,
          resolvedPath: bin,
          error: `${bin} --version exited with code ${code ?? '?'}: ${(stderr || stdout).trim().slice(0, 300)}`,
        });
      }
    });
  });
}

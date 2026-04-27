import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * On macOS, GUI apps (including Electron) inherit a stripped PATH that
 * usually omits places like /opt/homebrew/bin and the user's ~/.local/bin
 * — so `claude`, `codex`, and other tooling installed via brew/cargo/npm
 * fail to spawn. We augment PATH with the most common user-tool locations
 * before spawning child processes.
 *
 * This is a defensive override: anything already on PATH wins; we just
 * make sure the common places are *also* searchable.
 */
export function fortifiedPath(): string {
  const home = homedir();
  const extras = [
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/local/sbin',
    join(home, '.local/bin'),
    join(home, '.cargo/bin'),
    join(home, '.bun/bin'),
    join(home, '.deno/bin'),
    join(home, '.volta/bin'),
    // Claude Code installs to ~/.npm-global/bin or under nvm — best-effort
    join(home, '.npm-global/bin'),
  ];
  const existing = process.env['PATH'] ?? '';
  const seen = new Set(existing.split(':'));
  const merged = [existing, ...extras.filter((p) => !seen.has(p))].filter(Boolean).join(':');
  return merged;
}

/**
 * Returns a child-process env with PATH augmented for binary discovery.
 */
export function envWithPath(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: fortifiedPath() };
}

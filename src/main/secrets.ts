import { safeStorage } from 'electron';
import { kvGet, kvSet } from './db';

/**
 * Encrypted-at-rest storage for sensitive strings (API keys, OAuth secrets).
 *
 * Uses Electron's `safeStorage`, which delegates to the OS keychain:
 *   - macOS:   Keychain Services (login keychain entry per app)
 *   - Windows: DPAPI bound to the user account
 *   - Linux:   libsecret (gnome-keyring / KWallet) when available
 *
 * The ciphertext is stored in our SQLite kv_store, base64-encoded under
 * keys like `secret:aiApiKey`. On systems where safeStorage reports no
 * encryption available (rare — happens on minimal Linux installs without
 * a keyring service), values are kept in plaintext under the same key
 * with a `{plain: true}` envelope so the app keeps working.
 */

interface StoredSecret {
  v: 1;
  /** True when the OS keychain wasn't available — value is plaintext. */
  plain?: boolean;
  /** base64-encoded ciphertext (or plaintext when plain === true). */
  data: string;
}

const PREFIX = 'secret:';

function isAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

export function readSecret(key: string): string {
  const stored = kvGet<StoredSecret | string | null>(`${PREFIX}${key}`);
  if (!stored) return '';

  // Legacy plaintext value (string, no envelope) — possible during migration.
  if (typeof stored === 'string') {
    return stored;
  }

  if (stored.plain) return stored.data;

  if (!isAvailable()) {
    // Was encrypted on a system where safeStorage worked, but doesn't here
    // anymore (e.g. user migrated to a Linux box without keyring). We can't
    // decrypt — return empty and let the user re-enter.
    console.warn(`[secrets] safeStorage unavailable; cannot decrypt ${key}`);
    return '';
  }

  try {
    const buf = Buffer.from(stored.data, 'base64');
    return safeStorage.decryptString(buf);
  } catch (err) {
    // Ciphertext can't be decrypted with the current keychain identity —
    // typically happens in dev when the app's signing/path changes between
    // builds. The value is unrecoverable, so drop it instead of failing
    // loudly on every settings read; the user will re-enter it once.
    console.warn(
      `[secrets] discarding unreadable ciphertext for ${key} (${(err as Error).message})`,
    );
    kvSet(`${PREFIX}${key}`, null);
    return '';
  }
}

export function writeSecret(key: string, value: string): void {
  if (!value) {
    kvSet(`${PREFIX}${key}`, null);
    return;
  }
  if (isAvailable()) {
    const cipher = safeStorage.encryptString(value);
    const payload: StoredSecret = { v: 1, data: cipher.toString('base64') };
    kvSet(`${PREFIX}${key}`, payload);
  } else {
    const payload: StoredSecret = { v: 1, plain: true, data: value };
    kvSet(`${PREFIX}${key}`, payload);
  }
}

export const SECRET_KEYS = ['aiApiKey', 'wechatAppSecret'] as const;
export type SecretKey = (typeof SECRET_KEYS)[number];

/**
 * Migrate any plaintext secret values still living inside the legacy
 * `settings` blob into the new `secret:<key>` store. Idempotent — safe
 * to call on every boot.
 */
export function migrateSecretsFromLegacySettings(): void {
  const legacy = kvGet<Record<string, unknown> | null>('settings');
  if (!legacy) return;
  let mutated = false;
  for (const k of SECRET_KEYS) {
    const v = legacy[k];
    if (typeof v === 'string' && v.length > 0) {
      writeSecret(k, v);
      legacy[k] = '';
      mutated = true;
    }
  }
  if (mutated) {
    kvSet('settings', legacy);
    console.info('[secrets] migrated legacy plaintext secrets into safeStorage');
  }
}

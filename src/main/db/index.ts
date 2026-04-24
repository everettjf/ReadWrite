import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  const userData = app.getPath('userData');
  mkdirSync(userData, { recursive: true });
  const dbPath = join(userData, 'readwrite.sqlite');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_documents (
      path TEXT PRIMARY KEY,
      title TEXT,
      opened_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_sources (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      target TEXT NOT NULL,
      title TEXT,
      opened_at INTEGER NOT NULL
    );
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) return initDatabase();
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function kvGet<T = unknown>(key: string): T | null {
  const row = getDatabase().prepare('SELECT value FROM kv_store WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function kvSet(key: string, value: unknown): void {
  getDatabase()
    .prepare(
      `INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, JSON.stringify(value), Date.now());
}

export function recordRecentDocument(path: string, title?: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO recent_documents (path, title, opened_at) VALUES (?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET title = excluded.title, opened_at = excluded.opened_at`,
    )
    .run(path, title ?? null, Date.now());
}

export function listRecentDocuments(
  limit = 20,
): Array<{ path: string; title: string | null; opened_at: number }> {
  return getDatabase()
    .prepare('SELECT path, title, opened_at FROM recent_documents ORDER BY opened_at DESC LIMIT ?')
    .all(limit) as Array<{ path: string; title: string | null; opened_at: number }>;
}

import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * Серверное хранилище данных пользователей.
 * Каждая запись: { key, value, version, updated_at }
 * Version используется для разрешения конфликтов при синхронизации.
 */

interface DataRow {
  id: string;
  user_id: string;
  key: string;
  value: string; // JSON-строка
  version: number;
  updated_at: string;
}

let db: DatabaseSync | null = null;

function resolveDbPath(): string {
  const dataDir = process.env.DATA_DIR ?? 'data';
  return join(process.cwd(), dataDir, 'app.db');
}

export function getDataDb(): DatabaseSync {
  if (db) return db;

  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });

  db = new DatabaseSync(path);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_data (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      key        TEXT NOT NULL,
      value      TEXT NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, key)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);
  `);

  return db;
}

// --- Публичные API ---

/**
 * Получить все данные пользователя.
 */
export function getAllUserData(userId: string): Record<string, unknown> {
  const d = getDataDb();
  const rows = d.prepare(
    'SELECT key, value, version, updated_at FROM user_data WHERE user_id = ? ORDER BY key',
  ).all(userId) as unknown as DataRow[];

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result;
}

/**
 * Получить одно значение.
 */
export function getOneData(userId: string, key: string): unknown {
  const d = getDataDb();
  const row = d.prepare(
    'SELECT value, version FROM user_data WHERE user_id = ? AND key = ?',
  ).get(userId, key) as DataRow | undefined;

  if (!row) return undefined;

  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

/**
 * Сохранить одно значение (upsert).
 * Возвращает новую версию.
 */
export function setOneData(userId: string, key: string, value: unknown): number {
  const d = getDataDb();
  const id = randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);

  // Проверяем, существует ли запись
  const existing = d.prepare(
    'SELECT version FROM user_data WHERE user_id = ? AND key = ?',
  ).get(userId, key) as { version: number } | undefined;

  const version = (existing?.version ?? 0) + 1;

  d.prepare(
    `INSERT INTO user_data (id, user_id, key, value, version, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, key) DO UPDATE SET
       value = excluded.value,
       version = excluded.version,
       updated_at = excluded.updated_at`,
  ).run(id, userId, key, jsonValue, version, now);

  return version;
}

/**
 * Удалить одно значение.
 */
export function deleteData(userId: string, key: string): void {
  const d = getDataDb();
  d.prepare('DELETE FROM user_data WHERE user_id = ? AND key = ?').run(userId, key);
}

/**
 * Удалить все данные пользователя.
 */
export function clearAllData(userId: string): void {
  const d = getDataDb();
  d.prepare('DELETE FROM user_data WHERE user_id = ?').run(userId);
}

/**
 * Получить данные с версией для синхронизации.
 * Возвращает { key, value, version, updated_at }
 */
export function getDataWithVersions(userId: string): Array<{
  key: string;
  value: string;
  version: number;
  updated_at: string;
}> {
  const d = getDataDb();
  return d.prepare(
    'SELECT key, value, version, updated_at FROM user_data WHERE user_id = ? ORDER BY key',
  ).all(userId) as Array<{
    key: string;
    value: string;
    version: number;
    updated_at: string;
  }>;
}

/**
 * Массовое обновление данных (для синхронизации).
 * @param userId
 * @param data Массив { key, value, clientVersion, clientUpdated }
 * @returns { inserted: number, updated: number, conflicts: number }
 */
export function syncData(
  userId: string,
  data: Array<{
    key: string;
    value: string;
    clientVersion: number;
    clientUpdated: string;
  }>,
): { inserted: number; updated: number; conflicts: number } {
  const d = getDataDb();
  let inserted = 0;
  let updated = 0;
  let conflicts = 0;

  const insertStmt = d.prepare(
    `INSERT INTO user_data (id, user_id, key, value, version, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const updateStmt = d.prepare(
    `UPDATE user_data SET value = ?, version = ?, updated_at = ?
     WHERE user_id = ? AND key = ? AND version = ?`,
  );

  for (const item of data) {
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    // Сначала пробуем вставить
    try {
      insertStmt.run(id, userId, item.key, item.value, 1, now);
      inserted++;
    } catch {
      // Уже существует — проверяем версию (optimistic locking)
      const existing = d.prepare(
        'SELECT version FROM user_data WHERE user_id = ? AND key = ?',
      ).get(userId, item.key) as { version: number } | undefined;

      if (!existing) {
        // Вставка провалилась, но записи нет — редкий race condition, обновляем
        const newVersion = (item.clientVersion ?? 0) + 1;
        updateStmt.run(item.value, newVersion, now, userId, item.key, 0);
        updated++;
      } else if (existing.version === item.clientVersion) {
        // Версия совпадает — обновляем
        const newVersion = item.clientVersion + 1;
        updateStmt.run(item.value, newVersion, now, userId, item.key, item.clientVersion);
        updated++;
      } else {
        // Конфликт: сервер имеет более свежую версию
        conflicts++;
      }
    }
  }

  return { inserted, updated, conflicts };
}

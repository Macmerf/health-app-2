import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

/**
 * Серверное хранилище данных пользователей.
 * Каждая запись: { key, value, version, updated_at }
 * Version используется для разрешения конфликтов при синхронизации.
 *
 * Сжатие: значения больше COMPRESS_THRESHOLD байт хранятся gzip'ом
 * (объекты JSON дневников сжимаются в 3-6 раз). Признак — префикс "gz:".
 * На диске экономится место (50 ГБ NVMe с запасом), в памяти — RAM VPS.
 */

const COMPRESS_THRESHOLD = 1024; // сжимаем всё, что больше 1 КБ
const GZIP_PREFIX = 'gz:';

function compressValue(json: string): string {
  if (json.length <= COMPRESS_THRESHOLD) return json;
  return GZIP_PREFIX + gzipSync(Buffer.from(json, 'utf8'), { level: 6 }).toString('base64');
}

function decompressValue(stored: string): string {
  if (!stored.startsWith(GZIP_PREFIX)) return stored;
  return gunzipSync(Buffer.from(stored.slice(GZIP_PREFIX.length), 'base64')).toString('utf8');
}

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
  // resolve (не join): абсолютный DATA_DIR (/app/data в проде) корректно
  // заменяет cwd, а не склеивается с ним в /app/app/data
  return resolve(process.cwd(), dataDir, 'app.db');
}

export function getDataDb(): DatabaseSync {
  if (db) return db;

  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });

  db = new DatabaseSync(path);

  // WAL + busy_timeout — см. db.ts: меньше CPU на конкурентных запросах.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;

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
 * Получить все данные пользователя (с версиями — для LWW-синхронизации).
 */
export function getAllUserDataWithMeta(userId: string): Record<string, {
  value: unknown;
  version: number;
  updatedAt: string;
}> {
  const d = getDataDb();
  const rows = d.prepare(
    'SELECT key, value, version, updated_at FROM user_data WHERE user_id = ? ORDER BY key',
  ).all(userId) as unknown as Array<Pick<DataRow, 'key' | 'value' | 'version' | 'updated_at'>>;

  const result: Record<string, { value: unknown; version: number; updatedAt: string }> = {};
  for (const row of rows) {
    try {
      result[row.key] = {
        value: JSON.parse(decompressValue(row.value)),
        version: row.version,
        updatedAt: row.updated_at,
      };
    } catch {
      // Битая запись не должна ронять весь sync — пропускаем.
      continue;
    }
  }
  return result;
}

/**
 * Обратная совместимость: все данные без мета-информации.
 */
export function getAllUserData(userId: string): Record<string, unknown> {
  const all = getAllUserDataWithMeta(userId);
  const result: Record<string, unknown> = {};
  for (const [key, meta] of Object.entries(all)) {
    result[key] = meta.value;
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
  ).get(userId, key) as Pick<DataRow, 'value' | 'version'> | undefined;

  if (!row) return undefined;

  try {
    return JSON.parse(decompressValue(row.value));
  } catch {
    return row.value;
  }
}

/**
 * Сохранить одно значение (upsert). Значение сжимается gzip'ом.
 * Возвращает новую версию.
 */
export function setOneData(userId: string, key: string, value: unknown): number {
  const d = getDataDb();
  const id = randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const jsonValue = compressValue(typeof value === 'string' ? value : JSON.stringify(value));

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
 * Массовое обновление данных (для синхронизации). LWW + оптимистичная блокировка.
 *
 * Протокол для каждого элемента:
 *  1. Ключа нет на сервере → вставляем (version = 1).
 *  2. Ключ есть:
 *     - clientVersion === серверная версия → клиент видел последнюю, применяем
 *       (version+1).
 *     - clientVersion < серверной → конфликт версий. Разрешаем LWW по
 *       clientUpdated vs server updated_at: клиентская запись свежее —
 *       принимаем её, иначе оставляем серверную (conflict++).
 *  3. Значения сжимаются gzip'ом при записи.
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
     VALUES (?, ?, ?, ?, 1, ?)`,
  );

  const updateStmt = d.prepare(
    `UPDATE user_data SET value = ?, version = version + 1, updated_at = ?
     WHERE user_id = ? AND key = ? AND version = ?`,
  );

  const getStmt = d.prepare(
    'SELECT value, version, updated_at FROM user_data WHERE user_id = ? AND key = ?',
  );

  for (const item of data) {
    const now = new Date().toISOString();
    const compressed = compressValue(item.value);

    // Сначала пробуем вставить
    try {
      insertStmt.run(randomBytes(16).toString('hex'), userId, item.key, compressed, now);
      inserted++;
      continue;
    } catch {
      // Уже существует — ниже разрешаем конфликт версий
    }

    const existing = getStmt.get(userId, item.key) as
      | Pick<DataRow, 'value' | 'version' | 'updated_at'>
      | undefined;

    if (!existing) {
      // Race: вставка провалилась, записи нет — принудительное обновление.
      d.prepare(
        `UPDATE user_data SET value = ?, version = 1, updated_at = ? WHERE user_id = ? AND key = ?`,
      ).run(compressed, now, userId, item.key);
      updated++;
      continue;
    }

    // Версия совпадает — клиент работал поверх последней версии, применяем.
    if (existing.version === item.clientVersion) {
      const res = updateStmt.run(compressed, now, userId, item.key, existing.version);
      if (Number(res.changes) > 0) {
        updated++;
      } else {
        // Другой запрос успел обновить между SELECT и UPDATE — считаем конфликт.
        conflicts++;
      }
      continue;
    }

    // Конфликт версий: LWW по времени изменения. Клиент свежее — перезаписываем,
    // иначе оставляем серверную копию (клиент подтянет её при следующем pull).
    const clientTime = new Date(item.clientUpdated).getTime();
    const serverTime = new Date(existing.updated_at).getTime();
    if (Number.isFinite(clientTime) && clientTime > serverTime) {
      // Обновляем безусловно: клиентская запись объективно свежее.
      d.prepare(
        `UPDATE user_data SET value = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND key = ?`,
      ).run(compressed, now, userId, item.key);
      updated++;
    } else {
      conflicts++;
    }
  }

  return { inserted, updated, conflicts };
}

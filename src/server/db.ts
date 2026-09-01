import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface SubscriptionRow {
  user_id: string;
  tier: 'free' | 'premium';
  trial_started_at: string | null;
  expires_at: string | null;
  payment_method: string | null;
  updated_at: string;
  /** ID последнего обработанного платежа — защита от двойной активации (вебхук + проверка статуса). */
  last_payment_id?: string | null;
}

let db: DatabaseSync | null = null;

function resolveDbPath(): string {
  const dataDir = process.env.DATA_DIR ?? 'data';
  // resolve (не join): абсолютный DATA_DIR (/app/data в проде) корректно
  // заменяет cwd, а не склеивается с ним в /app/app/data
  // Динамический путь из env — осознанное исключение из трейсинга Turbopack.
  return resolve(/* turbopackIgnore: true */ process.cwd(), dataDir, 'app.db');
}

/** Лениво инициализирует SQLite (встроенный node:sqlite, Node >= 22.5). */
export function getDb(): DatabaseSync {
  if (db) return db;

  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });

  db = new DatabaseSync(path);

  // WAL: читатели не блокируют писателя и наоборот; fsync только в WAL-файл.
  // busy_timeout: вместо мгновенного SQLITE_BUSY при конкурентной записи —
  // короткое ожидание. На 2 vCPU это заметно снижает CPU-нагрузку.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id         TEXT PRIMARY KEY,
      tier            TEXT NOT NULL DEFAULT 'free',
      trial_started_at TEXT,
      expires_at      TEXT,
      payment_method  TEXT,
      updated_at      TEXT NOT NULL,
      last_payment_id TEXT
    );
  `);
  // Мягкие миграции: старая база могла иметь схему с device_id.
  // 1) колонка last_payment_id могла отсутствовать
  try {
    db.exec('ALTER TABLE subscriptions ADD COLUMN last_payment_id TEXT');
  } catch {
    // Колонка уже существует — ничего не делаем.
  }
  // 2) миграция device_id -> user_id (переход на подписки по аккаунтам)
  migrateDeviceIdSchema(db);
  return db;
}

/**
 * Одноразовая миграция старой схемы подписок (device_id) на новую (user_id).
 * Если таблица имеет колонку device_id — переименовываем и переносим данные.
 * Аккаунты и device-id-подписки не связаны автоматически: старые подписки
 * остаются доступными по историческому идентификатору (user_id = старый device_id),
 * связка с аккаунтом происходит при следующем успешном платеже.
 */
function migrateDeviceIdSchema(d: DatabaseSync): void {
  const cols = d.prepare(`PRAGMA table_info(subscriptions)`).all() as Array<{ name: string }>;
  const hasDeviceId = cols.some((c) => c.name === 'device_id');
  if (!hasDeviceId) return;

  d.exec(`
    ALTER TABLE subscriptions RENAME TO subscriptions_old;
    CREATE TABLE subscriptions (
      user_id         TEXT PRIMARY KEY,
      tier            TEXT NOT NULL DEFAULT 'free',
      trial_started_at TEXT,
      expires_at      TEXT,
      payment_method  TEXT,
      updated_at      TEXT NOT NULL,
      last_payment_id TEXT
    );
    INSERT INTO subscriptions (user_id, tier, trial_started_at, expires_at, payment_method, updated_at, last_payment_id)
      SELECT device_id, tier, trial_started_at, expires_at, payment_method, updated_at, last_payment_id
      FROM subscriptions_old;
    DROP TABLE subscriptions_old;
  `);
}

export function getSubscription(userId: string): SubscriptionRow | null {
  const row = getDb()
    .prepare('SELECT * FROM subscriptions WHERE user_id = ?')
    .get(userId) as SubscriptionRow | undefined;
  return row ?? null;
}

export function upsertSubscription(row: SubscriptionRow): void {
  getDb()
    .prepare(
      `INSERT INTO subscriptions (user_id, tier, trial_started_at, expires_at, payment_method, updated_at, last_payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         tier = excluded.tier,
         trial_started_at = excluded.trial_started_at,
         expires_at = excluded.expires_at,
         payment_method = excluded.payment_method,
         updated_at = excluded.updated_at,
         last_payment_id = COALESCE(excluded.last_payment_id, subscriptions.last_payment_id)`,
    )
    .run(
      row.user_id,
      row.tier,
      row.trial_started_at,
      row.expires_at,
      row.payment_method,
      row.updated_at,
      row.last_payment_id ?? null,
    );
}

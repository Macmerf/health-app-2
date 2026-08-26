import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface SubscriptionRow {
  device_id: string;
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
  // Динамический путь из env — осознанное исключение из трейсинга Turbopack.
  return join(/* turbopackIgnore: true */ process.cwd(), dataDir, 'app.db');
}

/** Лениво инициализирует SQLite (встроенный node:sqlite, Node >= 22.5). */
export function getDb(): DatabaseSync {
  if (db) return db;

  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });

  db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      device_id       TEXT PRIMARY KEY,
      tier            TEXT NOT NULL DEFAULT 'free',
      trial_started_at TEXT,
      expires_at      TEXT,
      payment_method  TEXT,
      updated_at      TEXT NOT NULL,
      last_payment_id TEXT
    );
  `);
  // Мягкая миграция: колонка могла отсутствовать в старой базе.
  try {
    db.exec('ALTER TABLE subscriptions ADD COLUMN last_payment_id TEXT');
  } catch {
    // Колонка уже существует — ничего не делаем.
  }
  return db;
}

export function getSubscription(deviceId: string): SubscriptionRow | null {
  const row = getDb()
    .prepare('SELECT * FROM subscriptions WHERE device_id = ?')
    .get(deviceId) as SubscriptionRow | undefined;
  return row ?? null;
}

export function upsertSubscription(row: SubscriptionRow): void {
  getDb()
    .prepare(
      `INSERT INTO subscriptions (device_id, tier, trial_started_at, expires_at, payment_method, updated_at, last_payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET
         tier = excluded.tier,
         trial_started_at = excluded.trial_started_at,
         expires_at = excluded.expires_at,
         payment_method = excluded.payment_method,
         updated_at = excluded.updated_at,
         last_payment_id = COALESCE(excluded.last_payment_id, subscriptions.last_payment_id)`,
    )
    .run(
      row.device_id,
      row.tier,
      row.trial_started_at,
      row.expires_at,
      row.payment_method,
      row.updated_at,
      row.last_payment_id ?? null,
    );
}

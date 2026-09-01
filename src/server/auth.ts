import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Авторизация: пользователи, сессии (JWT), хеши паролей.
 * Всё хранится в том же SQLite, что и подписки.
 */

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

const SALT_BYTES = 16;
const KEY_BYTES = 32;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

let db: DatabaseSync | null = null;

function resolveDbPath(): string {
  const dataDir = process.env.DATA_DIR ?? 'data';
  // resolve (не join): абсолютный DATA_DIR (/app/data в проде) корректно
  // заменяет cwd, а не склеивается с ним в /app/app/data
  return resolve(process.cwd(), dataDir, 'app.db');
}

export function getAuthDb(): DatabaseSync {
  if (db) return db;

  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });

  db = new DatabaseSync(path);

  // WAL + busy_timeout — см. db.ts: меньше CPU на конкурентных запросах.
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      email        TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt         TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
  `);

  // Таблица сессий
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Индекс для быстрого поиска сессий по user_id
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  return db;
}

/** Хеширование пароля (scrypt + salt). */
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = scryptSync(password, salt, KEY_BYTES).toString('hex');
  return { hash, salt };
}

/** Проверка пароля. */
function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const hash = scryptSync(password, salt, KEY_BYTES).toString('hex');
  return timingSafeEqual(
    Buffer.from(storedHash, 'hex'),
    Buffer.from(hash, 'hex'),
  );
}

/** Dummy-scrypt: выравнивает время ответа при несуществующем email. */
const DUMMY_SALT = '00000000000000000000000000000000';
function dummyVerify(): void {
  scryptSync('dummy-password', DUMMY_SALT, KEY_BYTES);
}

// --- Публичные API ---

/**
 * Регистрация пользователя.
 * @returns { user, token }
 */
export function registerUser(email: string, password: string): AuthSession {
  const db = getAuthDb();

  // Проверка, что email уже занят
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as
    | { id: string }
    | undefined;
  if (existing) {
    throw new Error('Email already registered');
  }

  const id = randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const { hash, salt } = hashPassword(password);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, email.toLowerCase(), hash, salt, now, now);

  // Создаём сессию
  const token = createSession(id);

  return {
    user: { id, email: email.toLowerCase(), created_at: now, updated_at: now },
    token,
  };
}

/**
 * Вход пользователя.
 * @returns { user, token }
 */
export function loginUser(email: string, password: string): AuthSession {
  const db = getAuthDb();

  const row = db.prepare(
    'SELECT * FROM users WHERE email = ?',
  ).get(email.toLowerCase()) as UserRow | undefined;

  if (!row) {
    // Фейковая проверка пароля — выравнивает время ответа с существующим email
    // (иначе перечисление email по таймингу ответа).
    dummyVerify();
    throw new Error('Invalid email or password');
  }

  if (!verifyPassword(password, row.password_hash, row.salt)) {
    throw new Error('Invalid email or password');
  }

  // Чистим истёкшие сессии (в т.ч. этого пользователя)
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());

  const token = createSession(row.id);

  return {
    user: {
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    token,
  };
}

/**
 * Проверка сессии по токену.
 * Токен — случайная строка в БД; подпись JWT не проверяется сознательно:
 * source of truth — таблица sessions (мгновенный revocation).
 */
export function getSession(token: string): AuthSession | null {
  const db = getAuthDb();

  const row = db.prepare(
    `SELECT s.user_id, s.expires_at, u.id, u.email, u.created_at, u.updated_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
  ).get(token, new Date().toISOString()) as
    | {
        user_id: string;
        expires_at: string;
        id: string;
        email: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    user: {
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    token,
  };
}

/**
 * Выход — удаление сессии.
 */
export function logoutUser(token: string): void {
  const db = getAuthDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Получение пользователя по ID.
 */
export function getUserById(id: string): User | null {
  const db = getAuthDb();
  const row = db.prepare(
    'SELECT id, email, created_at, updated_at FROM users WHERE id = ?',
  ).get(id) as User | undefined;
  return row ?? null;
}

// --- Внутренние ---

function createSession(userId: string): string {
  const db = getAuthDb();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  // Токен — 256 бит криптостойкой случайности. JWT не нужен: source of truth —
  // таблица sessions (мгновенный revocation, проверка только по БД).
  const token = randomBytes(32).toString('base64url');

  db.prepare(
    'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(token, userId, expiresAt, now);

  return token;
}

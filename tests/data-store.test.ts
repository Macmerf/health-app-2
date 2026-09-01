import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  setOneData,
  getOneData,
  getAllUserData,
  getAllUserDataWithMeta,
  deleteData,
  syncData,
} from '../src/server/data-store.ts';
import { getAuthDb } from '../src/server/auth.ts';

describe('data-store', () => {
  let tmp: string;
  let prevCwd: string;
  const userId = 'user-1';

  before(() => {
    tmp = mkdtempSync(join(tmpdir(), 'zabota-data-'));
    prevCwd = process.cwd();
    process.chdir(tmp);
    process.env.DATA_DIR = './data';
    process.env.JWT_SECRET = 'test-secret-'.padEnd(32, 'x');
    // Таблица users создаётся модулем auth (user_data ссылается на неё FK)
    const authDb = getAuthDb();
    const now = new Date().toISOString();
    authDb
      .prepare(
        'INSERT INTO users (id, email, password_hash, salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(userId, 'test@example.com', 'x', 'x', now, now);
  });

  after(() => {
    process.chdir(prevCwd);
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      // SQLite-файл может быть ещё открыт — очистка best-effort
    }
    delete process.env.DATA_DIR;
    delete process.env.JWT_SECRET;
  });

  it('setOneData / getOneData — запись и чтение', () => {
    setOneData(userId, 'journal', { entries: [1, 2] });
    const val = getOneData(userId, 'journal');
    assert.deepEqual(val, { entries: [1, 2] });
  });

  it('getAllUserData — возвращает все ключи', () => {
    setOneData(userId, 'exposure', { ladders: [] });
    const all = getAllUserData(userId);
    assert.ok('journal' in all);
    assert.ok('exposure' in all);
  });

  it('syncData — вставляет новые ключи', () => {
    const result = syncData(userId, [
      { key: 'new-key', value: JSON.stringify('hello'), clientVersion: 1, clientUpdated: new Date().toISOString() },
    ]);
    assert.equal(result.inserted, 1);
    assert.equal(result.updated, 0);
    assert.equal(result.conflicts, 0);
    assert.equal(getOneData(userId, 'new-key'), 'hello');
  });

  it('syncData — обновляет при совпадении версии', () => {
    // new-key сейчас version=1 на сервере
    const result = syncData(userId, [
      { key: 'new-key', value: JSON.stringify('updated'), clientVersion: 1, clientUpdated: new Date().toISOString() },
    ]);
    assert.equal(result.updated, 1);
    assert.equal(result.conflicts, 0);
    assert.equal(getOneData(userId, 'new-key'), 'updated');
  });

  it('syncData — LWW: клиентская запись свежее серверной перезаписывает при конфликте версий', () => {
    // Сервер version=2 (обновлён только что). Клиент шлёт version=1, но
    // clientUpdated в будущем относительно серверной updated_at → LWW отдаёт победу клиенту.
    const future = new Date(Date.now() + 60_000).toISOString();
    const result = syncData(userId, [
      { key: 'new-key', value: JSON.stringify('client-wins'), clientVersion: 1, clientUpdated: future },
    ]);
    assert.equal(result.updated, 1);
    assert.equal(result.conflicts, 0);
    assert.equal(getOneData(userId, 'new-key'), 'client-wins');
  });

  it('syncData — LWW: устаревшая клиентская запись не затирает серверную (conflict)', () => {
    // Клиент шлёт clientUpdated в прошлом — серверная версия новее.
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const result = syncData(userId, [
      { key: 'new-key', value: JSON.stringify('stale'), clientVersion: 1, clientUpdated: past },
    ]);
    assert.equal(result.conflicts, 1);
    assert.equal(getOneData(userId, 'new-key'), 'client-wins');
  });

  it('большие значения сжимаются gzip и читаются обратно', () => {
    // Строка > 1 КБ — триггерит компрессию в setOneData.
    const big = { blob: 'x'.repeat(10_000), note: 'дневник пациента' };
    setOneData(userId, 'big-value', big);
    assert.deepEqual(getOneData(userId, 'big-value'), big);
    // Проверяем, что на диске реально лежит сжатая запись (префикс gz:)
    const raw = getAuthDb().prepare(
      "SELECT value FROM user_data WHERE user_id = ? AND key = 'big-value'",
    ).get(userId) as { value: string };
    assert.ok(raw.value.startsWith('gz:'), 'значение должно быть сжато');
    assert.ok(raw.value.length < JSON.stringify(big).length, 'сжатая запись меньше исходной');
    deleteData(userId, 'big-value');
  });

  it('getAllUserDataWithMeta — возвращает значение с версией и временем', () => {
    setOneData(userId, 'meta-key', { a: 1 });
    const all = getAllUserDataWithMeta(userId);
    assert.ok(all['meta-key']);
    assert.equal(all['meta-key']!.version, 1);
    assert.ok(typeof all['meta-key']!.updatedAt === 'string');
    assert.deepEqual(all['meta-key']!.value, { a: 1 });
    deleteData(userId, 'meta-key');
  });

  it('deleteData — удаляет значение', () => {
    deleteData(userId, 'new-key');
    assert.equal(getOneData(userId, 'new-key'), undefined);
  });
});

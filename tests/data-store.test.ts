import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  setOneData,
  getOneData,
  getAllUserData,
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

  it('syncData — конфликт при устаревшей версии клиента', () => {
    // Сервер теперь version=2, клиент шлёт clientVersion=1
    const result = syncData(userId, [
      { key: 'new-key', value: JSON.stringify('stale'), clientVersion: 1, clientUpdated: new Date().toISOString() },
    ]);
    assert.equal(result.conflicts, 1);
    // Значение не перезаписалось
    assert.equal(getOneData(userId, 'new-key'), 'updated');
  });

  it('deleteData — удаляет значение', () => {
    deleteData(userId, 'new-key');
    assert.equal(getOneData(userId, 'new-key'), undefined);
  });
});

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  registerUser,
  loginUser,
  getSession,
  logoutUser,
} from '../src/server/auth.ts';

describe('auth', () => {
  let tmp: string;
  let prevCwd: string;
  const email = 'test@example.com';
  const password = 'secret123';

  before(() => {
    tmp = mkdtempSync(join(tmpdir(), 'zabota-auth-'));
    prevCwd = process.cwd();
    process.chdir(tmp); // resolveDbPath = join(cwd, DATA_DIR, 'app.db')
    process.env.DATA_DIR = './data';
    process.env.JWT_SECRET = 'test-secret-'.padEnd(32, 'x');
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

  it('сессия после регистрации валидна (токен находится в БД)', () => {
    const { user, token } = registerUser(email, password);
    assert.ok(token, 'должен вернуться токен');

    const session = getSession(token);
    assert.ok(session, 'getSession должен находить сессию по токену');
    assert.equal(session.user.id, user.id);
  });

  it('вход с верным паролем возвращает валидную сессию', () => {
    const { token } = loginUser(email, password);
    const session = getSession(token);
    assert.ok(session, 'getSession должен находить сессию по токену');
    assert.equal(session.user.email, email);
  });

  it('вход с неверным паролем отклоняется', () => {
    assert.throws(() => loginUser(email, 'wrong-password'), /Invalid email or password/);
  });

  it('logout инвалидирует сессию', () => {
    const { token } = loginUser(email, password);
    logoutUser(token);
    assert.equal(getSession(token), null);
  });
});

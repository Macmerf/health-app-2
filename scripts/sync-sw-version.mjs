#!/usr/bin/env node
/**
 * Синхронизирует версию кэша service worker'а с версией пакета.
 * Запускается автоматически в `prebuild` (см. package.json).
 *
 * CACHE_NAME в public/sw.js имеет вид `zabotapsy-v<version>`; при каждом
 * релизе новый номер => браузер считает SW изменившимся => пользователь
 * получает баннер «Доступна новая версия».
 *
 * Также подставляет BUILD_ID из Next.js (если сборка уже прошла) — не требуется,
 * потому что prebuild идёт ДО `next build`, поэтому используем package.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const swPath = join(root, 'public', 'sw.js');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

let sw = readFileSync(swPath, 'utf8');

const newCache = `zabotapsy-v${pkg.version}`;
const match = sw.match(/const CACHE_NAME = '(zabotapsy-v[^']+)';/);
if (!match) {
  console.error('[sync-sw-version] CACHE_NAME not found in public/sw.js');
  process.exit(1);
}

if (match[1] === newCache) {
  console.warn(`[sync-sw-version] SW cache is up to date: ${newCache}`);
} else {
  sw = sw.replace(match[1], newCache);
  writeFileSync(swPath, sw);
  console.warn(`[sync-sw-version] SW cache updated: ${match[1]} -> ${newCache}`);
}

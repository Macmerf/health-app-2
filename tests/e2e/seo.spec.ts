import { test, expect } from '@playwright/test';

/**
 * SEO-проверка: серверные SEO-страницы должны быть доступны,
 * отдавать 200 и содержать ожидаемый контент на русском языке.
 */
test('Статья отдаёт 200 и содержит заголовок', async ({ request }) => {
  const resp = await request.get('/articles/panichka-chto-delat');
  expect(resp.status()).toBe(200);
  const html = await resp.text();
  expect(html).toContain('Паническая атака: что делать прямо сейчас');
  expect(html).toContain('application/ld+json');
});

test('Индекс статей отдаёт список на русском', async ({ request }) => {
  const res = await request.get('/articles');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('Статьи о тревоге');
  expect(html).toContain('Лестница смелости');
});

test('sitemap.xml содержит главную и статьи', async ({ request }) => {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://zabotapsy.ru').replace(/\/$/, '');
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain(`<loc>${appUrl}</loc>`);
  expect(xml).toContain('/articles/');
  expect(xml).toContain('sitemap');
});

test('robots.txt ссылается на sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toContain('Sitemap:');
  expect(txt).toContain('/sitemap.xml');
});
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Smoke-тесты «Забота».
 * Запуск: npx playwright test
 * Dev-сервер поднимается автоматически.
 */

// page.context может быть property или method в разных версиях типов Playwright.
function ctxOf(page: Page): BrowserContext {
  const c = (page as unknown as { context: BrowserContext | (() => BrowserContext) }).context;
  return typeof c === 'function' ? c.call(page) : c;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Закрываем онбординг-тур, если показался
  const skipBtn = page.getByRole('button', { name: 'Пропустить тур' });
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
    await expect(skipBtn).toBeHidden();
  }
});

test('Главная загружается на русском языке', async ({ page }) => {
  await expect(page.getByText('Твой спутник при тревоге')).toBeVisible();
  await expect(page.getByText('Дневник эмоций').first()).toBeVisible();
  await expect(page.getByText('Лестница смелости').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
});

test('Запись в дневнике: полный wizard сохраняется', async ({ page }) => {
  // Точное совпадение — CTA-кнопка внизу главной (не карточка «Дневник эмоций»)
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click();

  // Шаг A — ситуация
  await expect(page.getByPlaceholder('Что случилось...')).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder('Что случилось...').fill('Начальник вызвал на разговор');
  await page.getByRole('button', { name: 'Далее' }).click();

  // Шаг B — мысли и эмоции
  await expect(page.getByPlaceholder('Какие мысли и эмоции появились...')).toBeVisible();
  await page.getByPlaceholder('Какие мысли и эмоции появились...').fill('Думаю, что меня уволят');
  await page.getByRole('button', { name: 'Далее' }).click();

  // Шаг C — физические проявления
  await expect(page.getByPlaceholder(/Например: стучит сердце/)).toBeVisible();
  await page.getByPlaceholder(/Например: стучит сердце/).fill('Стучит сердце, потеют ладони');
  await page.getByRole('button', { name: 'Далее' }).click();

  // Шаг D — уровень тревоги
  await expect(page.getByText('Уровень тревоги').first()).toBeVisible();
  await page.getByRole('button', { name: 'Далее' }).click();

  // Шаг E — новый взгляд
  await expect(page.getByPlaceholder('Как можно посмотреть на это иначе...')).toBeVisible();
  await page.getByPlaceholder('Как можно посмотреть на это иначе...').fill('Меня уже хвалили за похожие задачи, я справлялся');
  await page.getByRole('button', { name: 'Далее' }).click();

  // Обзор → Сохранить
  await expect(page.getByText('Обзор')).toBeVisible();
  await page.getByRole('button', { name: 'Сохранить' }).click();

  // Запись появилась в истории
  await expect(page.getByText('Начальник вызвал на разговор')).toBeVisible({ timeout: 10000 });
});

test('План заботы доступен через FAB за один тап', async ({ page }) => {
  // FAB — настоящая <button> с aria-label, в отличие от карточки на главной
  await page.getByRole('button', { name: 'План заботы', exact: true }).click();
  await expect(page.getByText('Признаки усталости')).toBeVisible();
  await expect(page.getByText('Что помогает')).toBeVisible();
  await expect(page.getByText('Контакты для поддержки')).toBeVisible();
});

test('Оплата: триал активируется в dev-режиме', async ({ page }) => {
  // Меню «Ещё» → Забота+
  await page.getByRole('button', { name: 'Ещё' }).click();
  await page.getByRole('menuitem', { name: 'Забота+' }).click();

  await expect(page.getByText('Базовые инструменты всегда бесплатны')).toBeVisible();

  // Старт триала (7 дней)
  await page.getByRole('button', { name: /Начать бесплатно/ }).click();

  // Подписка активировалась
  await expect(page.getByText('Подписка активна')).toBeVisible({ timeout: 10000 });
});

test('Офлайн: приложение остаётся доступным после установки SW', async ({ page }) => {
  // 1) Онлайн-заход: регистрируем SW и закэшируем страницу
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => navigator.serviceWorker.ready);

  // 2) Уходим в офлайн и перезагружаемся
  await ctxOf(page).setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Приложение офлайн-first: SPA доступно без сети
  await expect(page.getByText('Твой спутник при тревоге')).toBeVisible({ timeout: 15000 });
});
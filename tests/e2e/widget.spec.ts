import { test, expect } from '@playwright/test';

/**
 * Тест виджета ЮKassa с реальным тестовым магазином (ключи в .env.local).
 * Мокается только /api/entitlement (free + trialUsed), чтобы показалась кнопка
 * «Оплатить»; создание платежа (/api/payments) идёт в реальный тестовый магазин.
 * Запуск: npx playwright test tests/e2e/widget.spec.ts
 */

test('Виджет ЮKassa: платёж создаётся и форма рендерится', async ({ page }) => {
  // Сервер отвечает free + trialUsed — пейволл покажет кнопку «Оплатить».
  // Формат: плоский объект без обёртки (см. /api/entitlement).
  await page.route('**/api/entitlement**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        tier: 'free',
        expiresAt: null,
        trialStartedAt: '2026-01-01T00:00:00.000Z',
        trialUsed: true,
      }),
    }),
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Пропускаем онбординг, если показался
  const skipBtn = page.getByRole('button', { name: 'Пропустить тур' });
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
  }

  // Открываем пейволл — кнопка «Оплатить» видна (trialUsed=true, free).
  await page.getByRole('button', { name: 'Ещё' }).click();
  await page.getByRole('menuitem', { name: 'ЗаботаPsy+' }).click();
  await expect(page.getByRole('button', { name: /Оплатить/ })).toBeVisible({ timeout: 10000 });

  // Кликаем «Оплатить» — создаётся реальный платёж в тестовом магазине,
  // приходит confirmation_token и открывается виджет.
  await page.getByRole('button', { name: /Оплатить/ }).click();

  // Форма виджета ЮKassa рендерится: iframe внутри контейнера #yookassa-payment-form.
  await expect(
    page.locator('#yookassa-payment-form iframe').first(),
  ).toBeVisible({ timeout: 30000 });
});

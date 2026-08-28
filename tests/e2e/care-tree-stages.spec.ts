import { test, expect, type Page } from '@playwright/test';

/**
 * E2E-тест всех 6 стадий «Дерево заботы».
 *
 * Стадии (LEVELS в CareTree.tsx):
 *   0 — Семечко            (0+ практик)
 *   1 — Росток             (2+)
 *   2 — Молодое деревце    (7+)
 *   3 — Деревце            (20+)
 *   4 — Раскидистое дерево (50+)
 *   5 — Цветущее дерево    (100+)
 *
 * Подход: в beforeEach закрываем онбординг (и явно сохраняем флаг в IndexedDB),
 * активируем триал (premium). В каждом тесте записываем totalPractices в
 * IndexedDB (idb-keyval), перезагружаем страницу и проверяем стадию.
 */

const STAGES = [
  { practices: 0, name: 'Семечко' },
  { practices: 2, name: 'Росток' },
  { practices: 7, name: 'Молодое деревце' },
  { practices: 20, name: 'Деревце' },
  { practices: 50, name: 'Раскидистое дерево' },
  { practices: 100, name: 'Цветущее дерево' },
] as const;

/** Записывает totalPractices в store «Дерево заботы». */
async function setCareTreePractices(page: Page, total: number) {
  await page.evaluate((val) => {
    const payload = JSON.stringify({ state: { totalPractices: val }, version: 0 });
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('keyval-store');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        store.put(payload, 'zabotapsy_zabotapsy-care-tree');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, total);
}

/** Явно сохраняет tourCompleted: true — чтобы тур не появлялся после перезагрузки. */
async function persistOnboardingCompleted(page: Page) {
  await page.evaluate(() => {
    const payload = JSON.stringify({
      state: { tourCompleted: true, dismissedGuides: [] },
      version: 0,
    });
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('keyval-store');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        store.put(payload, 'zabotapsy_onboarding');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Закрываем онбординг-тур, если показался
  const skipBtn = page.getByRole('button', { name: 'Пропустить тур' });
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
  }
  await persistOnboardingCompleted(page);

  // Активируем триал → premium-entitlement устанавливается синхронно в store
  await page.getByRole('button', { name: 'Ещё' }).click();
  await page.getByRole('menuitem', { name: 'ЗаботаPsy+' }).click();
  await page.getByRole('button', { name: /Начать бесплатно/ }).click();
  await expect(page.getByText('Твой спутник при тревоге')).toBeVisible({ timeout: 10000 });
});

for (const stage of STAGES) {
  test(`Дерево заботы — стадия «${stage.name}» (${stage.practices} практик)`, async ({ page }) => {
    // 1. Записываем нужное количество практик в IndexedDB
    await setCareTreePractices(page, stage.practices);

    // 2. Перезагружаем: zustand-persist подхватит и totalPractices, и premium,
    //    и tourCompleted из IDB.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 3. Ждём основного контента + исчезновения онбординг-тура (гидрация прошла)
    await expect(page.getByText('Твой спутник при тревоге')).toBeVisible({ timeout: 15000 });
    const skipBtn = page.getByRole('button', { name: 'Пропустить тур' });
    await expect(skipBtn).toBeHidden({ timeout: 10000 }).catch(() => {});

    // 4. Открываем экран «Дерево заботы»
    await page.getByRole('button', { name: 'Ещё' }).click();
    await page.getByRole('menuitem', { name: 'Дерево заботы' }).click();

    // 5. Проверяем, что дерево видно (замок не показан — premium активен)
    await expect(page.getByText('Каждая практика помогает дереву расти')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/доступна в ЗаботаPsy\+/)).toBeHidden();

    // 6. Проверяем название стадии
    await expect(page.getByText(stage.name, { exact: true })).toBeVisible();

    // 7. Проверяем счётчик практик внутри SVG (там выводится «{N} практик»)
    await expect(
      page.locator('svg').getByText(`${stage.practices} практик`, { exact: true }),
    ).toBeVisible();

    // 8. Скриншот для визуальной проверки стадии
    await page.screenshot({
      path: `tests/e2e/screenshots/care-tree-stage-${stage.practices}.png`,
      fullPage: true,
    });
  });
}
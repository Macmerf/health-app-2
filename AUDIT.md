# Аудит проекта «Забота» — PWA Wellness App

> Дата аудита: 2026-08-17
> Версия: 0.2.1
| Параметр | Значение |
|---|---|
| **Стек** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Zustand, Prisma (SQLite), shadcn/ui |
| **Архитектура** | SPA с кастомным роутером через Zustand (единственный маршрут `/`) |
| **Хранилище** | IndexedDB (idb-keyval) через persist middleware Zustand |
| **Размер** | 126 файлов, ~473 KB исходного кода |

---

## 🔴 Критические проблемы

### 1. Отсутствуют иконки PWA — приложение не установится
**Файл:** `public/icons/` — **директория пуста**

`manifest.json`, `layout.tsx`, `sw.js` и `notifications.ts` ссылаются на:
- `/icons/icon-192.png`
- `/icons/icon-512.png`
- `/icons/icon-maskable-192.png`
- `/icons/icon-maskable-512.png`

Ни один из этих файлов не существует. Браузер не сможет установить PWA — отсутствие иконок является жёстким требованием для `beforeinstallprompt`.

### 2. Детектор кризисных состояний — мёртвый код
**Файл:** `src/shared/lib/crisis-detector.ts` (33 regex-паттерна)

Функция `checkCrisisKeywords()` — нигде не вызывается в приложении. Только экспортируется через `care-plan/index.ts`, но не используется ни в JournalWizard, ни в CarePlan, ни в других компонентах. При этом в `texts.ts` есть строка:

```ts
crisisDetected: 'Похоже, тебе сейчас тяжело. Позволь мне помочь.',
```

которая тоже никогда не отображается. Для wellness-приложения по работе с тревогой — это критический пробел в безопасности.

### 3. Потеря данных — поле `physical` не сохраняется
**Файл:** `src/features/journal/components/JournalWizard.tsx`

Шаг C (STEP_C) собирает текст о физических проявлениях:

```tsx
const [physical, setPhysical] = useState('');
```

Но в `handleSave()` (строка 114) поле `physical` не включено в сохраняемый объект `JournalEntry`. Схема `JournalEntrySchema` также не содержит поля `physical`. Данные, введённые пользователем на шаге C, теряются безвозвратно.

### 4. TypeScript errors игнорируются в сборке
**Файл:** `next.config.ts`

```ts
typescript: { ignoreBuildErrors: true },
reactStrictMode: false,
```

Ошибки типов не останавливают сборку. В сочетании с `noImplicitAny: false` (tsconfig.json) — код может содержать серьёзные type-ошибки, которые не будут обнаружены до рантайма.

### 5. ESLint практически отключён
**Файл:** `eslint.config.mjs`

Отключены все ключевые правила:
- `@typescript-eslint/no-explicit-any: "off"`
- `@typescript-eslint/no-unused-vars: "off"`
- `react-hooks/exhaustive-deps: "off"`
- `prefer-const: "off"`
- `no-console: "off"`

Линтер не предоставляет никакой гарантии качества кода.

---

## 🟠 Высокие проблемы

### 6. dev-скрипт сломан на Windows
**Файл:** `package.json`

```json
"dev": "next dev -p 3000 2>&1 | tee dev.log"
```

Команда `tee` — Unix-утилита, отсутствующая в cmd.exe. На Windows скрипт завершится ошибкой. Окружение разработчика — Windows.

### 7. Подписка «Забота+» целиком на клиенте
**Файлы:** `src/features/payments/*`

- `usePayment.ts` — все методы оплаты симулируют успех через `setTimeout`
- `store.ts` — премиум-статус хранится в IndexedDB, легко подделывается
- `FeatureGate.tsx` — проверка прав доступа происходит на клиенте

Решение задокументировано как `REVIEW`, но это фундаментальный архитектурный риск: монетизация не защищена.

### 8. Побочный эффект set() во время рендера
**Файл:** `src/features/payments/store.ts`, `FeatureGate.tsx`

`checkEntitlement()` (строка 75) вызывает `set()` при истечении подписки — прямо во время рендера компонента `FeatureGate`. Это React-антипаттерн, может вызывать:
- «Cannot update a component while rendering»
- Рендер-циклы и падение производительности

### 9. Мёртвый серверный код
- **Prisma schema** (`schema.prisma`) — модели `User`/`Post` (дефолтный шаблон), не используются
- **`src/lib/db.ts`** — PrismaClient, нигде не импортируется
- **`.env`** — `DATABASE_URL=file:/home/z/my-project/db/custom.db` (Linux-путь, несуществующий на Windows)
- **`src/app/api/route.ts`** — `{ message: "Hello, world!" }`, не используется
- **`next-auth`** в зависимостях — нигде не используется

Весь серверный слой — boilerplate, не имеющий отношения к приложению.

### 10. Мёртвый маршрут `journal-history`
**Файл:** `src/shared/lib/router.ts`

`'journal-history'` определён в типе `AppRoute`, но в `page.tsx` (Router) этого кейса нет. История дневника открывается по маршруту `'journal'`. Маршрут никогда не сматчится.

---

## 🟡 Средние проблемы

| # | Проблема | Файл |
|---|---|---|
| 11 | **SW CacheFirst — stale content** — после деплоя пользователи увидят старую версию, пока не обновится SW. Версия кэша `zabota-v1` никогда не меняется. | `public/sw.js` |
| 12 | **`next.config.ts.zbak`** — файл-бэкап в репозитории | Корень проекта |
| 13 | **Git-история squashed** — 1 коммит вместо заявленных 13. Нет traceability | `git log` |
| 14 | **Нулевое тестовое покрытие** — `tests/` содержит только shell-скрипты, 0 тестов | `tests/` |
| 15 | **Несоответствие нейминга** — `patternId`/`patternName` в JournalEntry заполняются из `EmotionSelector` (эмоции), а не «паттерны мыслей» | `JournalWizard.tsx` |
| 16 | **`crisisDetected` текст** — определён в `texts.ts`, но никогда не отображается | `texts.ts` |
| 17 | **SW регистрация** — silent fail, ошибки не логируются | `app-shell.tsx` |
| 18 | **`scheduleNotification`** — ссылается на несуществующие иконки | `notifications.ts` |
| 19 | **`mini-services/` пустая** — директория без содержимого | `mini-services/` |
| 20 | **`package.json name`** — `nextjs_tailwind_shadcn_ts` — не имя приложения, а шаблон | `package.json` |

---

## 🟢 Что хорошо

1. **Архитектура stores** — чистая, единообразная, все store используют одинаковый persist-паттерн через `createPersistConfig`
2. **UI-kit** — кастомная система компонентов (ZButton, ZCard, ZToast и др.) согласована по стилю
3. **Дизайн-система** — CSS-переменные, темы (light/dark/warm/forest/ocean), анимации Framer Motion
4. **SPA-роутер** — несмотря на ограничения, реализован чисто через Zustand с поддержкой истории
5. **Zod-схемы** — валидация на уровне данных (JournalEntry, ExposureStep, и т.д.)
6. **Офлайн-first** — IndexedDB (idb-keyval) для всех пользовательских данных
7. **Локализация** — все тексты вынесены в `texts.ts`, поддержка русского языка
8. **FeatureGate / Premium-разграничение** — паттерн правильный, хотя реализация пока заглушка
9. **Доступность** — `aria-label`, `role`, скринридер-атрибуты в UI-компонентах
10. **Эстетика кода** — код читаемый, компоненты декомпозированы, есть комментарии

---

## 💡 Рекомендации по приоритетам

### P0 — исправить сейчас
- [ ] Добавить иконки PWA в `public/icons/` (192, 512, maskable)
- [ ] Подключить `checkCrisisKeywords` в JournalWizard (шаг B) и CarePlan
- [ ] Добавить поле `physical` в `JournalEntrySchema` и сохранять его в `handleSave`

### P1 — до продакшена
- [ ] Убрать `ignoreBuildErrors: true` и настроить TypeScript строго
- [ ] Включить `reactStrictMode: true`
- [ ] Починить `dev` скрипт для Windows (убрать `tee`)
- [ ] Реализовать серверную валидацию подписки (или убрать до реальной интеграции)
- [ ] Удалить мёртвый код: Prisma, api/route, next-auth, db.ts
- [ ] Удалить мёртвый маршрут `journal-history`

### P2 — улучшения
- [ ] Избавиться от `checkEntitlement` set() во время рендера
- [ ] Добавить SW update flow (версионирование кэша)
- [ ] Настроить тесты (хотя бы smoke-тесты)
- [ ] Привести нейминг `patternId` → `emotionId` и т.д.
- [ ] Удалить `next.config.ts.zbak`, `download/`, `mini-services/`
- [ ] Переименовать `package.json name` в `zabota`

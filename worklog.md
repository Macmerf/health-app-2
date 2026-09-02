# Worklog — Забота PWA

---
Task ID: 1-8
Agent: Super Z (main)
Task: Полная реализация PWA wellness-приложения «Забота» для поддержки при тревоге (Блоки 1-8)

Work Log:
- БЛОК 1: Создана структура проекта, установлены зависимости (@fontsource/onest, idb-keyval), настроен PWA (manifest.json, sw.js), дизайн-токены в CSS, texts.ts, storage factory, Zod 4 схемы, git
- БЛОК 2: Создан UI-кит (ZButton, ZCard, ZInput, ZTextArea, ZSlider, ZToast, ZBadge, ZSegmentedControl, ZBottomNav, ZHeader, ZProgressBar)
- БЛОК 3: Реализован дневник мыслей — 18 узоров мышления, wizard A→B→C→D→Preview→Save, store с IndexedDB persistence
- БЛОК 4: Реализована лестница смелости — HierarchyBuilder с DnD, ExposureSession с таймером и SUDs checks, HabituationChart через Recharts
- БЛОК 5: Реализован план заботы — CarePlanScreen, BreathingExercise (анимация круга), Grounding54321, crisis-detector (33 regex-паттерна)
- БЛОК 6: Реализована монетизация — entitlements model, FeatureGate, PremiumUpsell, PaywallScreen, usePayment hook
- БЛОК 7: Реализованы ачивки (18 шт.) и уведомления — AchievementIcon, AchievementsGallery, NotificationsScreen, notification utility
- БЛОК 8: Интеграция SPA роутера в page.tsx, PageTransition, HomePage с быстрыми практиками, FAB для плана заботы, исправлены дублирующиеся заголовки и toast контекст

Stage Summary:
- Все 8 блоков выполнены
- 13 атомарных коммитов по Conventional Commits
- Приложение открывается на русском языке
- Все фичи работают: дневник, лестница, план заботы, дыхание, заземление, ачивки, настройки, подписка
- Базовый функционал бесплатен и доступен всегда
- Дизайн-система соблюдена (цвета, шрифт Onest, радиусы, тени, анимации)

---
Task ID: deploy-docs
Agent: Koda
Task: Инструкция по деплою на Timeweb + автодеплой из GitHub

Work Log:
- Создана пошаговая инструкция deploy/timeweb-caddy.md (покупка VPS/домена, DNS, Docker, Caddy, .env, запуск, YooKassa-вебхук, обновления, troubleshooting)
- Добавлен .github/workflows/deploy.yml — автодеплой по SSH при push в main (секреты SSH_HOST/SSH_USER/SSH_PRIVATE_KEY)

Stage Summary:
- Проект готов к деплою на Timeweb Cloud Server (VPS) по инструкции deploy/timeweb-caddy.md

---
Task ID: env-prices-cleanup
Agent: Koda
Task: Устранение дублей и хардкода цен (env + клиент)

Work Log:
- .env.example: убран дубль PRICE_RUB (был объявлен дважды), добавлены отсутствующие PRICE_YEAR_RUB и PRICE_FOREVER_RUB
- src/shared/constants/plans.ts: удалён мёртвый дубликат PLANS с захардкоженными ценами (осталась только FOREVER_EXPIRES_AT)
- src/features/payments/usePlans.ts: новый хук — цены загружаются с сервера (GET /api/payments, из env), офлайн-фолбэк в одном месте; заметка «Выгоднее — X ₽/мес» считается из цены года
- PaywallScreen: тарифы и цены из usePlans; trialNote стал шаблоном «от {price}/мес»
- PremiumUpsell: бейдж цены месяца из usePlans вместо хардкода «150 ₽/мес»
- texts.ts: убраны захардкоженные цены (plans, price), trialNote — шаблон
- Проверка: tsc --noEmit ✓, npm test (27 pass) ✓, npm run build ✓; ошибки линтера в auth-context.tsx — преждесуществующие, не связаны с правками

Stage Summary:
- Источник цен — env на сервере; смена цены в .env сразу видна в UI без правок кода

---
Task ID: perf-vps-optimization
Agent: Koda
Task: Оптимизация под VPS 2 vCPU/4GB + ускорение старта приложения

Work Log:
- page.tsx: код-сплиттинг всех 16 экранов через next/dynamic со скелетоном — раньше все экраны (recharts, dnd-kit, платежи) жили в главном бандле
- sw.js: убрано кэширование /api/* в Cache API (персональные данные + замедление sync); одноразовая очистка старых API-записей в activate
- db.ts/auth.ts/data-store.ts: PRAGMA journal_mode=WAL, busy_timeout=5000, synchronous=NORMAL — меньше SQLITE_BUSY и CPU на конкурентных запросах
- Шрифт Onest переведён с 4 @fontsource CSS на next/font (self-hosted, сабсеты latin+cyrillic, swap); @fontsource/onest удалён
- Удалены неиспользуемые зависимости: next-intl, @tanstack/react-table, uuid
- CI: .github/workflows/ci.yml (lint + tsc + unit-тесты) на каждый PR/push
- deploy.yml: сборка Docker-образа перенесена в GitHub Actions (buildx + GHCR, кеш слоёв gha); VPS делает только git pull + docker compose pull + up -d — Next.js build больше не жжёт 2 vCPU сервера
- docker-compose.yml: image из GHCR вместо build on VPS, добавлен healthcheck
- Проверка: tsc ✓, eslint ✓, 27 unit-тестов ✓, next build ✓; свежий бандл 31 чанк / 1.79 МБ (было 6 чанков по ~1.1 МБ в критическом пути)

Stage Summary:
- Старт приложения быстрее: главный экран грузит компактный бандл, тяжёлые библиотеки — лениво по требованию
- Деплой не нагружает CPU VPS: сборка в CI, сервер только тянет готовый образ
- SQLite переведён на WAL — выше производительность и стабильность под конкурентной нагрузкой

---
Task ID: sync-compression-hydration
Agent: Koda
Task: Рабочая синхронизация сторов (LWW) + gzip-сжатие данных + hydration-скелетоны + лимиты RAM

Work Log:
- src/server/data-store.ts: gzip-сжатие значений >1 КБ (префикс gz:, level 6) — дневниковые JSON сжимаются в 3-6 раз; getAllUserDataWithMeta() отдаёт value+version+updatedAt; syncData переписан на LWW: совпадение версии → update, конфликт → побеждает более свежий updatedAt
- src/app/api/data/sync GET: теперь возвращает версии и время изменений (клиент может честно делать LWW)
- src/shared/lib/store-sync.tsx (новый): единый движок синхронизации всех persist-сторов (journal, exposure, careplan, mood, care-tree, achievements, notification-settings); pull при логине с LWW-мержем, push с debounce 3 c / max wait 30 c, подписка на изменения сторов, anti-loop флаг applyingRemote, повтор push при ошибке сети и на visibilitychange/online; версии в localStorage (zabotapsy-sync-meta)
- src/app/layout.tsx: DataSyncProvider заменён на StoreSyncProvider; удалены мёртвые data-sync-context.tsx и use-data-sync.ts
- src/shared/lib/storage.ts: onRehydrateStorage помечает hydration флагом + хук useHydrated(name)
- JournalHistory, HierarchyList: hydration-скелетоны вместо мигающего «нет записей» при чтении IndexedDB
- docker-compose.yml: NODE_OPTIONS=--max-old-space-size=512, deploy.resources.limits.memory=768M — защита RAM 4 ГБ VPS
- Caddyfile: encode zstd gzip (60-80% экономии трафика), Cache-Control immutable для /_next/static
- tests/data-store.test.ts: +3 теста (LWW клиент-побеждает, LWW сервер-побеждает, gzip roundtrip + проверка префикса gz:); 30 pass
- Проверка: tsc ✓, eslint ✓, 30/30 тестов ✓, next build ✓

Stage Summary:
- Синхронизация реально работает: данные всех сторов едут на сервер при изменениях и возвращаются на других устройствах; конфликты решаются по времени изменения
- Данные на сервере сжаты gzip'ом — экономия диска и RAM; критично для 2 vCPU/4 ГБ
- Старт UI без ложных «пустых экранов»: скелетоны на время hydration IndexedDB
- RAM сервера ограничена (768M контейнер + 512M heap), исходящий трафик сжат на уровне Caddy

---

Task ID: fixes-journal-pdf-quicknotes
Agent: Koda
Task: Фикс 4 проблем: дневник слетает при переходе в практику; бесконечный скелетон дневника/лестницы; добавить экспорт в PDF; быстрые заметки

Work Log:
- **Бесконечный скелетон дневника и лестницы**: src/shared/lib/storage.ts — заменил самодельный `setInterval(check, 300)` + `localStorage` флаг на штатный `persist.hasHydrated()` + `onFinishHydration()`. Реестр hydration в памяти (`hydrationRegistry`) с подпиской через `useSyncExternalStore`. Добавлен safety-net 2.5 c — если hydration так и не пришёл (ошибка IDB), UI всё равно покажется, иначе навсегда застрянем в скелетоне
- src/shared/ui/RegisterPersistHydration.tsx — новый компонент, регистрирует все 9 пользовательских сторов в реестре hydration при монтировании AppShell. Это чисто клиентский код, не выполняется на SSR
- **Данные дневника слетают при переходе в практику**: src/features/journal/draftStore.ts — новый zustand-стор `useJournalDraftStore` с persist в IndexedDB. Хранит все поля wizard (ситуация, мысли, физические проявления, эмоция, узор мышления, SUDS до/после, новый взгляд, ответы на вопросы рефлексии, текущий шаг). При навигации в дыхание/заземление данные сохраняются, при возврате — восстанавливаются на том же шаге
- src/features/journal/components/JournalWizard.tsx — переписан с локального useState на draft-store. Разделён на обёртку `JournalWizard` (проверка hydration) и `JournalWizardBody` (основная логика), чтобы не нарушать правила React. `clearDraft()` вызывается после успешного сохранения записи
- src/features/journal/data/emotions.ts — добавлен хелпер `emotionById`
- **Быстрые заметки**: src/features/quick-notes/ — новый модуль. `useQuickNotesStore` хранит короткие текстовые заметки + опционально эмоцию. `QuickNoteList` — экран со списком заметок и формой добавления. Кнопка "Разобрать в дневнике" подставляет текст заметки в поле «Ситуация» черновика и открывает wizard на шаге 0
- src/shared/lib/router.ts — добавлен маршрут 'quick-notes'
- src/app/page.tsx — QuickNoteList подключён через dynamic, ссылка добавлена в настройки
- src/shared/ui/HomePage.tsx — карточка «Быстрая заметка» на главной с подсказкой
- **Экспорт в PDF**: src/features/export/pdfExport.ts — новый модуль. `openPrintableReport()` открывает новое окно с красиво свёрстанным HTML (A4, поля 18мм, цветные SUDS-бары, бейджи эмоций, обложка, футер), инициирует `window.print()`. Пользователь в системном диалоге выбирает «Сохранить как PDF». Без новых зависимостей (бандл не раздулся)
- src/features/export/DataExport.tsx — обновлён UI: на первом месте карточка «Красивый отчёт для терапевта (PDF)» с двумя режимами (полный / без настроения), ниже CSV-выгрузки дневника и настроения
- Stage Summary: 4 проблемы закрыты: (1) данные дневника сохраняются при переходе в практику; (2) бесконечный скелетон заменён на штатный API + safety-net 2.5 c; (3) экспорт теперь в PDF (через печать браузера) + CSV; (4) добавлены быстрые заметки с конвертацией в дневник. Проверка: tsc ✓, eslint ✓, 30/30 unit-тестов ✓, next build ✓




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

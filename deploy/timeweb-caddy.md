# Деплой «Заботы» на Timeweb — пошагово для новичка

Что получится в конце: сайт `https://zabotapsy.ru` работает, при `git push` в ветку `main`
приложение само обновляется на сервере, данные (SQLite) не теряются.

---

## Шаг 0. Что нужно перед стартом

- Аккаунт на **timeweb.cloud**
- Аккаунт на **github.com**
- Домен **zabotapsy.ru** (если нет — купим в шаге 2)
- Ключи **YooKassa** (shopId + секретный ключ). Если их ещё нет — приложение
  заработает и без них (dev-режим оплаты), добавишь потом.

Покупаем: **только VPS и домен**. SSL и всё остальное — бесплатно.

---

## Шаг 1. Покупаем сервер (VPS)

1. Зайди на https://timeweb.cloud → кнопка **«Создать»** → **«Облачный сервер»**.
2. Заполни так:
   - **ОС**: Ubuntu 24.04
   - **Регион**: Россия (Москва или Питер — ближе к пользователям)
   - **Конфигурация**: 2 CPU / 4 GB RAM / 30 GB NVMe
     (4 GB RAM нужны, чтобы сервер не умер при сборке приложения;
     вариант «2 GB» дешевле, но тогда делаем swap — см. шаг 4.4)
   - **Публичный IP**: включён (по умолчанию)
3. Нажми **«Заказать»** → **«Оплатить»**.
4. Через пару минут сервер появится в панели. Сохрани из карточки сервера:
   - **IP-адрес** (например `185.104.x.x`)
   - **Пароль root** (придёт в уведомление/на почту, либо задай свой во вкладке «Доступ»)

---

## Шаг 2. Домен и DNS

**Если домена нет:** там же в Timeweb — раздел **«Домены и DNS»** →
**«Зарегистрировать домен»** → ищешь `zabotapsy.ru` → покупаешь (~200–900 ₽/год).

**Подключаем домен к серверу:**

1. Открой раздел **«Домены»** → выбери свой домен → **«DNS-записи»** (или зайди
   в панель регистратора, где куплен домен).
2. Добавь (или проверь, что есть) запись:

   | Тип | Имя | Значение | TTL |
   |-----|------|--------------------|-----|
   | A | @ | IP_ТВОЕГО_СЕРВЕРА | 600 |

   Пример: `A @ 185.104.x.x`
3. Если хочешь, чтобы работал и `www.zabotapsy.ru`, добавь ещё:
   `A www IP_ТВОЕГО_СЕРВЕРА`

Проверка через 10–15 минут: открой PowerShell на своём ПК и выполни
`nslookup zabotapsy.ru` — должен вернуться IP сервера. Пока DNS не
обновился, дальше идти бессмысленно.

---

## Шаг 3. Первый вход на сервер

На своём Windows-ПК открой **PowerShell** и введи (подставь свой IP):

```powershell
ssh root@185.104.x.x
```

- На вопрос `Are you sure you want to continue connecting?` → набери `yes`
- Введи пароль root из шага 1 (при вводе символы не отображаются — это нормально)

Если увидел приветствие Ubuntu — ты на сервере. Все команды ниже вводятся
**на сервере** (в этом же окне).

---

## Шаг 4. Готовим сервер

### 4.1 Обновляем систему

```bash
apt update && apt upgrade -y
```

### 4.2 Ставим Docker

```bash
curl -fsSL https://get.docker.com | sh
```

Проверка: `docker --version` — должна показать версию.

### 4.3 Ставим Caddy (веб-сервер, сам сделает HTTPS-сертификат)

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 4.4 Swap (только если взял сервер 2 GB RAM)

Без этого сборка может упасть с ошибкой «Killed»:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Шаг 5. Загружаем код с GitHub

### 5.1 Если репозитория ещё нет

На своём ПК (не на сервере):

```powershell
git init
git add .
git commit -m "initial"
git branch -M main
git remote add origin https://github.com/ТВОЙ_ЛОГИН/zabota.git
git push -u origin main
```

(репозиторий предварительно создай на github.com кнопкой **«New repository»**,
можно приватным)

### 5.2 Клонируем на сервер

**Если репозиторий публичный** — просто:

```bash
cd /opt
git clone https://github.com/ТВОЙ_ЛОГИН/zabota.git
cd zabota
```

**Если приватный** (наш случай): нужен Personal Access Token.

1. На GitHub: аватарка → **Settings** → в левом меню внизу **Developer settings**
   → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
2. Название любое, срок — выбери без ограничения или длинный,
   галочка **repo** — обязательно. **Generate token**.
3. Скопируй токен (показывается один раз!).
4. На сервере:

```bash
cd /opt
git clone https://ТВОЙ_ЛОГИН:ВСТАВЬ_ТОКЕН@github.com/ТВОЙ_ЛОГИН/zabota.git
cd zabota
```

GitHub запомнит токен и больше не спросит.

---

## Шаг 6. Создаём .env на сервере

```bash
cp .env.example .env
nano .env
```

`nano` — простейший редактор: стрелками ходишь, правишь текст,
выход — `Ctrl+O`, Enter (сохранить), `Ctrl+X` (выйти).

Заполни:

```env
YOOKASSA_SHOP_ID=...          # из кабинета YooKassa (если есть)
YOOKASSA_SECRET_KEY=...       # живой_секрет_ключ (если есть)
YOOKASSA_WEBHOOK_SECRET=...   # пока можно оставить пустым
APP_BASE_URL=https://zabotapsy.ru
NEXT_PUBLIC_APP_URL=https://zabotapsy.ru
```

**Важно:** файл `.env` в git не коммитится — он живёт только на сервере.

---

## Шаг 7. Запускаем приложение

Находясь в `/opt/zabota`:

```bash
docker compose up -d --build
```

Первая сборка займёт 3–10 минут (качает образы, собирает Next.js).

Проверка, что жив:

```bash
curl http://127.0.0.1:3000
```

Должна прилететь HTML-страница. Если да — приложение работает, остался HTTPS.

---

## Шаг 8. Настраиваем Caddy (HTTPS + домен)

1. Создаём директорию конфигурации (если нет):

   ```bash
   mkdir -p /etc/caddy
   ```

2. Открываем конфиг:

   ```bash
   nano /etc/caddy/Caddyfile
   ```

Сотри всё (в nano: держи `Ctrl+K`) и вставь:

```
zabotapsy.ru, www.zabotapsy.ru {
	reverse_proxy 127.0.0.1:3000
}
```

Сохрани и выйди, затем перезапусти Caddy:

```bash
systemctl restart caddy
systemctl enable caddy
```

Caddy сам получит бесплатный SSL-сертификат Let's Encrypt (до минуты).

### Открываем порты

В панели Timeweb: карточка сервера → вкладка **«Сеть» / «Файрвол»** —
убедись, что разрешены порты **22, 80, 443** (по умолчанию обычно открыты все).

---

## Шаг 9. Проверяем

Открой в браузере **https://zabotapsy.ru** — должен открыться сайт с
зелёным замком 🔒. 

Если что-то не так — смотри логи:

```bash
docker compose logs -f web     # логи приложения (выход: Ctrl+C)
journalctl -u caddy -f         # логи Caddy
```

---

## Шаг 10. YooKassa

1. В кабинете YooKassa: **Настройки → HTTP-уведомления (вебхуки)** → URL:
   ```
   https://zabotapsy.ru/api/payments/webhook
   ```
   События: создание платежа, успешный платёж, отмена.
2. Скопируй секрет уведомлений в `.env` на сервере (`YOOKASSA_WEBHOOK_SECRET`),
   затем `nano .env` → вставь → и перезапусти:
   ```bash
   docker compose up -d
   ```

---

## Шаг 11. Обновления

### Вручную (самый простой способ)

На своём ПК: `git push` → на сервере:

```bash
cd /opt/zabota
git pull
docker compose up -d --build
```

Данные подписок (SQLite в volume `app-data`) при этом **не теряются**.

### Автоматически (GitHub Actions)

В репозитории уже лежит workflow `.github/workflows/deploy.yml`:
каждый push в `main` сам обновит сервер. Один раз настроить:

1. На своём ПК сгенерируй SSH-ключ (в PowerShell):
   ```powershell
   ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\deploy_key -N '""'
   ```
   Появятся 2 файла: `deploy_key` (приватный) и `deploy_key.pub` (публичный).
2. Публичный ключ — на сервер:
   ```powershell
   type $env:USERPROFILE\.ssh\deploy_key.pub | ssh root@185.104.x.x "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
   ```
3. Приватный ключ — в GitHub: репозиторий → **Settings** → **Secrets and
   variables** → **Actions** → **New repository secret**. Создай три секрета:
   - `SSH_HOST` → IP сервера
   - `SSH_USER` → `root`
   - `SSH_PRIVATE_KEY` → **полное содержимое файла** `deploy_key`
     (открой в блокноте, скопируй всё, включая строки
     `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END ... -----`)
4. Готово. `git push origin main` → сервер обновляется сам
   (прогресс виден во вкладке **Actions** репозитория).

---

## Если что-то сломалось (шпаргалка)

| Симптом | Что делать |
|---|---|
| Сайт не открывается | `docker compose ps` — контейнер `zabota` должен быть `Up` |
| Ошибка 502 Bad Gateway | Приложение ещё поднимается или упало: `docker compose logs -f web` |
| `docker compose up` пишет «Cannot connect to Docker» | Docker не запущен: `systemctl start docker` |
| Сборка падает с «Killed» | Мало RAM — сделай swap (шаг 4.4) или возьми тариф больше |
| Сертификат не выдаётся | DNS ещё не обновился (шаг 2) или порты 80/443 закрыты |
| Забыл пароль root | Панель Timeweb → сервер → вкладка «Доступ» → сбросить пароль |

Полезные команды:

```bash
docker compose ps              # статус контейнеров
docker compose logs -f web     # логи приложения
docker compose up -d --build   # пересобрать и перезапустить
docker compose down            # остановить (данные в volume останутся)
```

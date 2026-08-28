# syntax=docker/dockerfile:1
# ============================================================
# «Забота» — production-образ (Next.js standalone + node:sqlite)
# Требует Node >= 22.5 для встроенного модуля node:sqlite.
# Деплой: Timeweb Cloud Server (VPS) + Docker.
# ============================================================

# ---- Stage 1: build ----
FROM node:24-alpine AS builder
WORKDIR /app

# Публичный домен вшивается в клиентский бандл на этапе сборки.
# Передаётся через --build-arg (или compose build.args), дефолт из env.example.
ARG NEXT_PUBLIC_APP_URL=https://zabotapsy.ru
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Кешируем установку зависимостей отдельно от исходников
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# SQLite-файл лежит здесь — монтируем как постоянный volume (см. docker-compose)
ENV DATA_DIR=/app/data

# Непривилегированный пользователь
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone-сервер Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Каталог данных должен быть writable — создаём заранее
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

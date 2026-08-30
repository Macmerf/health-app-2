'use client';

import { useEffect, useState } from 'react';
import type { SubscriptionPlan } from '@/shared/schemas';

export interface PlanView {
  id: SubscriptionPlan;
  title: string;
  price: string;
  note?: string;
}

const ORDER: SubscriptionPlan[] = ['month', 'year', 'forever'];

const TITLES: Record<SubscriptionPlan, string> = {
  month: 'Месяц',
  year: 'Год',
  forever: 'Навсегда',
};

/**
 * Офлайн-фолбэк: единственное место с ценами на клиенте.
 * Источник истины — env на сервере (GET /api/payments);
 * фолбэк нужен, только пока цены не загрузились или сеть недоступна.
 */
const FALLBACK_PRICES: Record<SubscriptionPlan, number> = {
  month: 150,
  year: 1250,
  forever: 2700,
};

type Prices = Partial<Record<SubscriptionPlan, number>>;

function buildPlans(prices: Prices): PlanView[] {
  const yearRub = prices.year ?? FALLBACK_PRICES.year;
  return ORDER.map((id) => ({
    id,
    title: TITLES[id],
    price: `${prices[id] ?? FALLBACK_PRICES[id]} ₽`,
    note:
      id === 'month'
        ? '+30 дней'
        : id === 'year'
          ? `Выгоднее — ${Math.round(yearRub / 12)} ₽/мес`
          : 'Один платёж — доступ без срока',
  }));
}

/**
 * Тарифы для UI. Цены загружаются с сервера (GET /api/payments, из env),
 * при офлайне — фолбэк. Смена цены в env на сервере сразу видна в UI.
 */
export function usePlans(): PlanView[] {
  const [plans, setPlans] = useState<PlanView[]>(() => buildPlans({}));

  useEffect(() => {
    let cancelled = false;
    fetch('/api/payments', { cache: 'no-store', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { plans?: { id: string; priceRub: number }[] } | null) => {
        if (cancelled || !data?.plans?.length) return;
        const prices: Prices = {};
        for (const p of data.plans) {
          if (ORDER.includes(p.id as SubscriptionPlan) && typeof p.priceRub === 'number') {
            prices[p.id as SubscriptionPlan] = p.priceRub;
          }
        }
        setPlans(buildPlans(prices));
      })
      .catch(() => {
        // Офлайн — остаёмся на фолбэке.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return plans;
}

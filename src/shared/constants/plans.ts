/**
 * Тарифные планы ЗаботаPsy+ — клиентские константы.
 * Цены дублируют серверные (env PRICE_RUB / PRICE_YEAR_RUB / PRICE_FOREVER_RUB)
 * и предназначены для отображения в UI.
 */
import type { SubscriptionPlan } from '@/shared/schemas';

/** Дата «навсегда» — совпадает с серверной FOREVER_EXPIRES_AT. */
export const FOREVER_EXPIRES_AT = '9999-12-31T23:59:59.000Z';

export interface PlanView {
  id: SubscriptionPlan;
  title: string;
  price: string;
  note?: string;
}

export const PLANS: PlanView[] = [
  { id: 'month', title: 'Месяц', price: '150 ₽', note: '+30 дней' },
  { id: 'year', title: 'Год', price: '1250 ₽', note: 'Выгоднее — 104 ₽/мес' },
  { id: 'forever', title: 'Навсегда', price: '2700 ₽', note: 'Один платёж — доступ без срока' },
];

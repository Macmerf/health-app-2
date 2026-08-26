import { NextResponse } from 'next/server';
import { createYookassaPayment, yookassaConfigured } from '@/server/yookassa';
import { activateSubscription, isSubscriptionPlan, plansForClient, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

interface CreatePaymentBody {
  deviceId?: string;
  method?: 'yookassa_card' | 'sbp' | 'manual_transfer' | 'widget';
  plan?: string;
}

/** GET — список тарифных планов для клиента. */
export async function GET() {
  return NextResponse.json({ plans: plansForClient() });
}

export async function POST(request: Request) {
  let body: CreatePaymentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const deviceId = body.deviceId;
  const method = body.method ?? 'widget';
  const plan = body.plan && isSubscriptionPlan(body.plan) ? body.plan : 'month';
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
  }

  try {
    const payment = await createYookassaPayment({ deviceId, method, plan });

    // dev-режим: подписка активируется сразу (для локального теста флоу).
    // В проде подписку активирует вебхук или проверка статуса после оплаты виджетом.
    if (payment.dev) {
      const entitlement: ServerEntitlement = activateSubscription(deviceId, method, plan);
      return NextResponse.json({ payment, entitlement });
    }

    // Прод: возвращаем токен для инициализации виджета ЮKassa.
    return NextResponse.json({ payment, entitlement: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message, configured: yookassaConfigured() }, { status: 500 });
  }
}

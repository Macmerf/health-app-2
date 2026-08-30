import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { createYookassaPayment, requireYookassaConfigured, yookassaConfigured } from '@/server/yookassa';
import { activateSubscription, isSubscriptionPlan, plansForClient, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

interface CreatePaymentBody {
  plan?: string;
}

/** GET — список тарифных планов для клиента. */
export async function GET() {
  return NextResponse.json({ plans: plansForClient() });
}

/**
 * POST — создать платёж для текущего пользователя.
 * deviceId не принимаем: пользователь определяется сессией.
 * В dev-режиме (без ключей YooKassa) подписка активируется сразу — только локально.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreatePaymentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = body.plan && isSubscriptionPlan(body.plan) ? body.plan : 'month';
  const userId = auth.user.id;

  try {
    requireYookassaConfigured();
    const payment = await createYookassaPayment({ userId, plan });

    // dev-режим: подписка активируется сразу (для локального теста флоу).
    // В проде подписку активирует вебхук или проверка статуса после оплаты виджетом.
    if (payment.dev) {
      const entitlement: ServerEntitlement = activateSubscription(userId, 'widget', plan);
      return NextResponse.json({ payment, entitlement });
    }

    // Прод: возвращаем токен для инициализации виджета ЮKassa.
    return NextResponse.json({ payment, entitlement: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message, configured: yookassaConfigured() }, { status: 500 });
  }
}

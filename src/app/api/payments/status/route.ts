import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { getPaymentInfo, yookassaConfigured } from '@/server/yookassa';
import { activateSubscriptionForPayment, getServerEntitlement, planFromMetadata, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

/**
 * Проверка статуса платежа ЮKassa и активация подписки, если оплата прошла.
 * Решает гонку «виджет сообщил success, а вебхук ещё не пришёл»:
 * клиент после события success виджета опрашивает этот эндпоинт,
 * и подписка активируется сразу, не дожидаясь вебхука.
 * Двойная активация исключена через last_payment_id.
 * Требует авторизацию: deviceId из query больше не принимается.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const paymentId = url.searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
  }

  if (!yookassaConfigured()) {
    // dev-режим: статус не проверить, возвращаем текущее состояние подписки.
    const entitlement: ServerEntitlement = getServerEntitlement(auth.user.id);
    return NextResponse.json({ status: 'dev', entitlement });
  }

  try {
    const payment = await getPaymentInfo(paymentId);

    // Метаданные платежа обязаны ссылаться на текущего пользователя —
    // чужой платёж не активирует подписку.
    const paymentUserId = payment.metadata?.userId;
    if (paymentUserId !== auth.user.id) {
      return NextResponse.json({ error: 'Payment does not belong to this user' }, { status: 403 });
    }

    let entitlement: ServerEntitlement = getServerEntitlement(auth.user.id);
    if (payment.status === 'succeeded' && payment.paid) {
      entitlement = activateSubscriptionForPayment(
        auth.user.id,
        payment.metadata?.paymentMethod ?? 'widget',
        paymentId,
        planFromMetadata(payment.metadata?.plan),
      );
    }

    return NextResponse.json({ status: payment.status, entitlement });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

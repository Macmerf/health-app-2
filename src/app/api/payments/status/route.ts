import { NextResponse } from 'next/server';
import { getPaymentInfo, yookassaConfigured } from '@/server/yookassa';
import { activateSubscriptionForPayment, getServerEntitlement, planFromMetadata, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

/**
 * Проверка статуса платежа ЮKassa и активация подписки, если оплата прошла.
 * Решает гонку «виджет сообщил success, а вебхук ещё не пришёл»:
 * клиент после события success виджета опрашивает этот эндпоинт,
 * и подписка активируется сразу, не дожидаясь вебхука.
 * Двойная активация исключена через last_payment_id.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('paymentId');
  const deviceId = url.searchParams.get('deviceId');

  if (!paymentId || !deviceId) {
    return NextResponse.json({ error: 'paymentId and deviceId are required' }, { status: 400 });
  }

  if (!yookassaConfigured()) {
    // dev-режим: статус не проверить, возвращаем текущее состояние подписки.
    const entitlement: ServerEntitlement = getServerEntitlement(deviceId);
    return NextResponse.json({ status: 'dev', entitlement });
  }

  try {
    const payment = await getPaymentInfo(paymentId);

    // Метаданные платежа должны совпадать с deviceId — чужой платёж не активирует подписку.
    const paymentDeviceId = payment.metadata?.deviceId;
    if (paymentDeviceId && paymentDeviceId !== deviceId) {
      return NextResponse.json({ error: 'Payment does not belong to this device' }, { status: 403 });
    }

    let entitlement: ServerEntitlement = getServerEntitlement(deviceId);
    if (payment.status === 'succeeded' && payment.paid) {
      entitlement = activateSubscriptionForPayment(
        deviceId,
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

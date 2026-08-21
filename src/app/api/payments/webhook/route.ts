import { NextResponse } from 'next/server';
import { verifyWebhook } from '@/server/yookassa';
import { activateSubscription, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

/**
 * Вебхук YooKassa: приходит после успешной оплаты.
 * В dev-режиме (без YOOKASSA_WEBHOOK_SECRET) принимаем события без проверки подписи.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-YooKassa-Signature') ?? request.headers.get('x-yookassa-signature');

  if (!verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: {
    event?: string;
    object?: { metadata?: { deviceId?: string; paymentMethod?: string } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const deviceId = payload.object?.metadata?.deviceId;
  const method = payload.object?.metadata?.paymentMethod ?? 'yookassa_card';

  if (!deviceId || payload.event !== 'payment.succeeded') {
    // Событие не связано с подпиской — отвечаем 200, чтобы не было ретраев.
    return NextResponse.json({ ok: true });
  }

  const entitlement: ServerEntitlement = activateSubscription(deviceId, method);
  return NextResponse.json({ ok: true, entitlement });
}

import { NextResponse } from 'next/server';
import { verifyWebhook } from '@/server/yookassa';
import { activateSubscriptionForPayment, planFromMetadata, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

/**
 * Вебхук YooKassa: приходит после успешной оплаты.
 * В production требует YOOKASSA_WEBHOOK_SECRET (fail-closed, см. verifyWebhook):
 * без него подписку мог бы активировать кто угодно POST-запросом.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('X-YooKassa-Signature') ?? request.headers.get('x-yookassa-signature');

  if (!verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: {
    event?: string;
    object?: { id?: string; metadata?: { userId?: string; paymentMethod?: string; plan?: string } };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const userId = payload.object?.metadata?.userId;
  const paymentId = payload.object?.id;
  const method = payload.object?.metadata?.paymentMethod ?? 'widget';
  const plan = planFromMetadata(payload.object?.metadata?.plan);

  if (!userId || payload.event !== 'payment.succeeded') {
    // Событие не связано с подпиской — отвечаем 200, чтобы не было ретраев.
    return NextResponse.json({ ok: true });
  }

  // Идемпотентно: повторный вебхук по тому же платежу не продлит подписку.
  const entitlement: ServerEntitlement = activateSubscriptionForPayment(userId, method, paymentId ?? 'webhook', plan);
  return NextResponse.json({ ok: true, entitlement });
}

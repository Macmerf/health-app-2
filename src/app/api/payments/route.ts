import { NextResponse } from 'next/server';
import { createYookassaPayment, yookassaConfigured } from '@/server/yookassa';
import { activateSubscription, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

interface CreatePaymentBody {
  deviceId?: string;
  method?: 'yookassa_card' | 'sbp' | 'manual_transfer';
}

export async function POST(request: Request) {
  let body: CreatePaymentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const deviceId = body.deviceId;
  const method = body.method;
  if (!deviceId || !method) {
    return NextResponse.json({ error: 'deviceId and method are required' }, { status: 400 });
  }

  try {
    const payment = await createYookassaPayment({ deviceId, method });

    // dev-режим: подписка активируется сразу (для локального теста флоу).
    // В проде подписку активирует вебхук после подтверждения оплаты.
    if (payment.dev) {
      const entitlement: ServerEntitlement = activateSubscription(deviceId, method);
      return NextResponse.json({ payment, entitlement });
    }

    return NextResponse.json({ payment, entitlement: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message, configured: yookassaConfigured() }, { status: 500 });
  }
}

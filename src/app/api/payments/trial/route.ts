import { NextResponse } from 'next/server';
import { startTrialForDevice, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { deviceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const deviceId = body.deviceId;
  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
  }

  const entitlement: ServerEntitlement = startTrialForDevice(deviceId);
  return NextResponse.json(entitlement);
}

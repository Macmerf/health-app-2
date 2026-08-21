import { NextResponse } from 'next/server';
import { getServerEntitlement, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
  }

  const entitlement: ServerEntitlement = getServerEntitlement(deviceId);
  return NextResponse.json(entitlement);
}

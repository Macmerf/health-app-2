import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { getServerEntitlement, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

/**
 * GET /api/entitlement — состояние подписки текущего пользователя.
 * Идентификатор берётся из сессии, а не из query — чужую подписку получить нельзя.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlement: ServerEntitlement = getServerEntitlement(auth.user.id);
  return NextResponse.json(entitlement);
}

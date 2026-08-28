import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { rateLimit, getRateLimitHeaders } from '@/server/rate-limiter';
import { startTrialForUser, type ServerEntitlement } from '@/server/entitlement';

export const runtime = 'nodejs';

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * POST /api/payments/trial — старт триала для аккаунта (один раз на аккаунт).
 * Требует авторизацию: анонимно триал больше не выдаётся (иначе — бесконечные
 * триалы через генерацию новых deviceId).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(ip) },
    );
  }

  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlement: ServerEntitlement = startTrialForUser(auth.user.id);
  return NextResponse.json(entitlement);
}

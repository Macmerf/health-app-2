import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { getAllUserDataWithMeta, syncData } from '@/server/data-store';
import { rateLimit, getRateLimitHeaders } from '@/server/rate-limiter';

const MAX_ITEMS = 500;
const MAX_VALUE_LENGTH = 200_000; // 200 KB per value (JSON string)

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * GET /api/data/sync — получить все данные пользователя с версиями.
 * Формат: { data: { [key]: { value, version, updatedAt } } }
 * Клиент сравнивает версии и решает, чьи данные свежее (LWW).
 * POST /api/data/sync — синхронизировать данные (push)
 */
export async function GET(req: NextRequest) {
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

  const data = getAllUserDataWithMeta(auth.user.id);
  return NextResponse.json({ data });
}

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Expected array of data items' },
      { status: 400 },
    );
  }

  if (body.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `Too many items (max ${MAX_ITEMS})` },
      { status: 413 },
    );
  }

  const items: Array<{
    key: string;
    value: string;
    clientVersion: number;
    clientUpdated: string;
  }> = [];

  for (const raw of body) {
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 });
    }
    const r = raw as Record<string, unknown>;
    const key = r.key;
    const value = r.value;

    if (typeof key !== 'string' || key.length === 0) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }
    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }
    if (value.length > MAX_VALUE_LENGTH) {
      return NextResponse.json({ error: 'Value too large' }, { status: 413 });
    }

    items.push({
      key,
      value,
      clientVersion:
        typeof r.clientVersion === 'number' ? r.clientVersion : 1,
      clientUpdated:
        typeof r.clientUpdated === 'string'
          ? r.clientUpdated
          : new Date().toISOString(),
    });
  }

  const result = syncData(auth.user.id, items);
  return NextResponse.json(result);
}

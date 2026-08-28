import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { getOneData, setOneData, deleteData } from '@/server/data-store';

/**
 * GET /api/data/:key — получить значение
 * PUT /api/data/:key — обновить значение
 * DELETE /api/data/:key — удалить значение
 */

const MAX_VALUE_LENGTH = 200_000; // 200 KB — синхронизировано с /api/data/sync

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await requireAuth(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await params;
  const value = getOneData(auth.user.id, decodeURIComponent(key));

  if (value === undefined) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ value });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_VALUE_LENGTH) {
    return NextResponse.json({ error: 'Value too large' }, { status: 413 });
  }

  const { key } = await params;
  let value: unknown;
  try {
    value = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
    return NextResponse.json({ error: 'Value too large' }, { status: 413 });
  }
  if (value !== null && typeof value === 'object' && JSON.stringify(value).length > MAX_VALUE_LENGTH) {
    return NextResponse.json({ error: 'Value too large' }, { status: 413 });
  }

  const version = setOneData(auth.user.id, decodeURIComponent(key), value);

  return NextResponse.json({ version });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const auth = await requireAuth(_req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await params;
  deleteData(auth.user.id, decodeURIComponent(key));

  return NextResponse.json({ message: 'Deleted' });
}

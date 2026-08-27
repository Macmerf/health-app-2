import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { getOneData, setOneData, deleteData } from '@/server/data-store';

/**
 * GET /api/data/:key — получить значение
 * PUT /api/data/:key — обновить значение
 * DELETE /api/data/:key — удалить значение
 */

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

  const { key } = await params;
  const value = await req.json();

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

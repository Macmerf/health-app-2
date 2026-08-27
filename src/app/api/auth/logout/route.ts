import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth-middleware';
import { logoutUser } from '@/server/auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Получаем токен из cookie
  const token = req.headers.get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('session='))
    ?.split('=')[1];

  if (token) {
    logoutUser(token);
  }

  const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  response.cookies.set('session', '', { maxAge: 0, path: '/' });

  return response;
}

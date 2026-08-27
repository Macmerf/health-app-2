/**
 * Middleware для авторизации.
 * Вызывается из API route как: const user = await requireAuth(c);
 */
import { NextRequest } from 'next/server';
import { getSession } from '@/server/auth';

export interface AuthRequest {
  user: { id: string; email: string; created_at: string; updated_at: string };
}

/**
 * Извлекает и проверяет сессию из запроса.
 * Поддерживает: Authorization: Bearer <token> или cookie: session
 */
export async function requireAuth(req: NextRequest): Promise<AuthRequest | null> {
  // 1. Проверяем Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = getSession(token);
    if (session) {
      return { user: session.user };
    }
  }

  // 2. Проверяем cookie
  const cookie = req.headers.get('cookie');
  if (cookie) {
    const sessionCookie = parseCookie(cookie, 'session');
    if (sessionCookie) {
      const session = getSession(sessionCookie);
      if (session) {
        return { user: session.user };
      }
    }
  }

  return null;
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*([^;]*)`));
  return match ? match[1] : null;
}

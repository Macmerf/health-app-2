import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginUser } from '@/server/auth';
import { rateLimit, getRateLimitHeaders } from '@/server/rate-limiter';

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(1024),
});

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(ip) },
    );
  }

  try {
    const parsed = credentialsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const { email, password } = parsed.data;

    const { user, token } = loginUser(email, password);

    const response = NextResponse.json({ user }, { status: 200 });

    // Устанавливаем cookie с токеном
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

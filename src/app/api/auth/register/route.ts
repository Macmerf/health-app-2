import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerUser } from '@/server/auth';
import { rateLimit, getRateLimitHeaders } from '@/server/rate-limiter';

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // Верхняя граница длины — scrypt от мегабайтного входа это CPU-DoS.
  password: z.string().min(8).max(1024),
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
      return NextResponse.json(
        { error: 'Enter a valid email and a password of at least 8 characters' },
        { status: 400 },
      );
    }
    const { email, password } = parsed.data;

    const { user, token } = registerUser(email, password);

    const response = NextResponse.json({ user }, { status: 201 });

    // Устанавливаем cookie с токеном
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 дней
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    if (message === 'Email already registered') {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

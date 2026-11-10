import { NextResponse } from 'next/server';
import { authenticateAdmin, setAdminSessionCookie, getCurrentAdmin } from '@/lib/auth.js';
import { loginSchema } from '@/lib/validation.js';
import { checkRateLimit } from '@/lib/security.js';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ authenticated: false, admin: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, admin });
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(`login:${ip}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many login attempts. Please wait ${rate.retryAfterSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Invalid login credentials.' },
        { status: 400 }
      );
    }

    const { username, password, rememberMe } = parsed.data;
    const result = await authenticateAdmin(username, password);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    await setAdminSessionCookie(result.admin, rememberMe);
    return NextResponse.json({
      ok: true,
      admin: result.admin,
      mustChangePassword: result.admin.mustChangePassword,
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { ok: false, error: 'An unexpected server error occurred during authentication.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdminSession } from '@/lib/auth.js';
import { handleGoogleOAuthCallback } from '@/lib/google-drive.js';
const OAUTH_STATE_COOKIE = 'mh_google_oauth_state';

export async function GET(request) {
  const { authorized } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/admin/integrations/google-drive?error=${encodeURIComponent(oauthError)}`, request.url)
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL('/admin/integrations/google-drive?error=invalid_oauth_state', request.url)
    );
  }

  try {
    await handleGoogleOAuthCallback(code);
    return NextResponse.redirect(
      new URL('/admin/integrations/google-drive?connected=1', request.url)
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_exchange_failed';
    return NextResponse.redirect(
      new URL(`/admin/integrations/google-drive?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}

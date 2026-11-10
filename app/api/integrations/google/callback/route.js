import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleGoogleOAuthCallback, verifySignedOAuthState } from '@/lib/google-drive.js';

const OAUTH_STATE_COOKIE = 'mh_google_oauth_state';

function renderCallbackHtml({ ok, error = '', data = null }) {
  const payload = JSON.stringify({
    type: ok ? 'GOOGLE_OAUTH_SUCCESS' : 'GOOGLE_OAUTH_ERROR',
    ok,
    error,
    data,
  });
  const redirectTarget = ok
    ? '/admin/integrations/google-drive?connected=1'
    : `/admin/integrations/google-drive?error=${encodeURIComponent(error || 'oauth_failed')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Google Drive OAuth</title>
  <style>
    body { background: #09090B; color: #F4F1EA; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { background: #111115; border: 1px solid #27272E; border-radius: 8px; padding: 24px 32px; text-align: center; max-width: 420px; }
    .gold { color: #C8A464; font-weight: 600; font-size: 14px; }
  </style>
</head>
<body>
  <div class="box">
    <p class="gold">${ok ? 'Google Drive Connected Successfully!' : 'Google OAuth Error'}</p>
    <p style="font-size:12px;color:#9A9AA2;">${
      ok
        ? 'Creating "Musics" and "Images" folders... This window will close automatically.'
        : error
    }</p>
  </div>
  <script>
    (function() {
      var msg = ${payload};
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.postMessage(msg, '*');
          setTimeout(function() { window.close(); }, 300);
          return;
        } catch (e) {}
      }
      window.location.replace(${JSON.stringify(redirectTarget)});
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return renderCallbackHtml({ ok: false, error: oauthError });
  }

  const cookieStore = await cookies();
  cookieStore.delete(OAUTH_STATE_COOKIE);

  const verified = verifySignedOAuthState(state);
  if (!code || !verified.valid) {
    return renderCallbackHtml({
      ok: false,
      error: 'Invalid or expired OAuth state parameter. Please click Connect again.',
    });
  }

  try {
    const result = await handleGoogleOAuthCallback(code, verified.redirectUri);
    return renderCallbackHtml({ ok: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_exchange_failed';
    return renderCallbackHtml({ ok: false, error: msg });
  }
}


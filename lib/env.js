function isInternalPort(urlStr) {
  if (!urlStr) return false;
  return /localhost:(1000\b|10000\b)|127\.0\.0\.1:(1000\b|10000\b)/.test(urlStr);
}

export function getEnvConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Render automatically sets RENDER_EXTERNAL_URL (e.g. 'https://my-app.onrender.com')
  // and RENDER_EXTERNAL_HOSTNAME in container environments.
  const renderUrl =
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : '');

  let rawAppUrl = process.env.APP_URL || '';
  if (!rawAppUrl || isInternalPort(rawAppUrl)) {
    rawAppUrl = renderUrl || 'http://localhost:3000';
  }
  const appUrl = rawAppUrl.replace(/\/+$/, '');

  const databaseUrl = process.env.DATABASE_URL || '';
  const authSecret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    'masud-hauqe-platform-internal-hmac-key-2026';
  const defaultAdminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
  const requireCustomAdminPassword = process.env.REQUIRE_CUSTOM_ADMIN_PASSWORD === 'true';

  const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  let explicitRedirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();

  // If explicit redirect URI in env was mistakenly set to Render's internal container port (localhost:1000/10000),
  // override with the public domain so Google OAuth never navigates users to localhost:1000.
  if (isInternalPort(explicitRedirectUri)) {
    if (renderUrl || (process.env.APP_URL && !isInternalPort(process.env.APP_URL))) {
      explicitRedirectUri = '';
    }
  }

  const googleRedirectUri =
    explicitRedirectUri || `${appUrl}/api/integrations/google/callback`;
  const googleOAuthScopes =
    process.env.GOOGLE_OAUTH_SCOPES || 'https://www.googleapis.com/auth/drive';
  const googleTokenEncryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || authSecret;
  const youtubeApiKey = (process.env.YOUTUBE_API_KEY || '').trim();
  const maxMusicFileSizeMb = Number(process.env.MAX_MUSIC_FILE_SIZE_MB || 100);

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    appUrl,
    databaseUrl,
    authSecret,
    defaultAdminUsername,
    defaultAdminPassword,
    requireCustomAdminPassword,
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      redirectUri: googleRedirectUri,
      explicitRedirectUri,
      scopes: googleOAuthScopes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      encryptionKey: googleTokenEncryptionKey,
      isConfigured: Boolean(googleClientId && googleClientSecret),
    },
    youtube: {
      apiKey: youtubeApiKey,
      isConfigured: Boolean(youtubeApiKey),
    },
    upload: {
      maxFileSizeMb: maxMusicFileSizeMb,
      maxFileSizeBytes: maxMusicFileSizeMb * 1024 * 1024,
    },
  };
}

export function resolveGoogleRedirectUri(preferredOrigin = '') {
  const env = getEnvConfig();

  if (env.google.explicitRedirectUri && !isInternalPort(env.google.explicitRedirectUri)) {
    return env.google.explicitRedirectUri;
  }

  let origin = preferredOrigin ? preferredOrigin.trim() : '';

  // Filter out internal Render container ports (localhost:1000 / localhost:10000)
  if (!origin || isInternalPort(origin)) {
    origin = env.appUrl;
  }

  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}/api/integrations/google/callback`;
}


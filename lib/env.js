export function getEnvConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const databaseUrl = process.env.DATABASE_URL || '';
  const authSecret =
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    'masud-hauqe-platform-internal-hmac-key-2026';
  const defaultAdminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin';
  const requireCustomAdminPassword = process.env.REQUIRE_CUSTOM_ADMIN_PASSWORD === 'true';

  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const googleRedirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${appUrl.replace(/\/$/, '')}/api/integrations/google/callback`;
  const googleOAuthScopes =
    process.env.GOOGLE_OAUTH_SCOPES || 'https://www.googleapis.com/auth/drive';
  const googleTokenEncryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || authSecret;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY || '';
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

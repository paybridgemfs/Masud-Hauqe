import { google } from 'googleapis';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import { getEnvConfig, resolveGoogleRedirectUri } from './env.js';
import { encryptSecret, decryptSecret } from './security.js';
import { getDbState, updateDbState, logAuditEvent } from './db.js';

export const DRIVE_MUSIC_FOLDER_NAME = 'Musics';
export const DRIVE_IMAGE_FOLDER_NAME = 'Images';

export function getOAuth2Client(customRedirectUri = null) {
  const { google: gConfig } = getEnvConfig();
  if (!gConfig.isConfigured) {
    throw new Error(
      'Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in .env.'
    );
  }
  const redirectUri = customRedirectUri || gConfig.redirectUri;
  return new google.auth.OAuth2(gConfig.clientId, gConfig.clientSecret, redirectUri);
}

export function createSignedOAuthState(redirectUri) {
  const { authSecret } = getEnvConfig();
  const payloadObj = {
    nonce: crypto.randomBytes(16).toString('hex'),
    redirectUri,
    exp: Date.now() + 15 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySignedOAuthState(stateToken) {
  if (!stateToken || typeof stateToken !== 'string' || !stateToken.includes('.')) {
    return { valid: false, redirectUri: null };
  }
  const { authSecret } = getEnvConfig();
  const [payloadB64, sig] = stateToken.split('.');
  if (!payloadB64 || !sig) {
    return { valid: false, redirectUri: null };
  }
  const expectedSig = crypto
    .createHmac('sha256', authSecret)
    .update(payloadB64)
    .digest('base64url');
  if (sig !== expectedSig) {
    return { valid: false, redirectUri: null };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!parsed.exp || Date.now() > parsed.exp) {
      return { valid: false, redirectUri: null };
    }
    return { valid: true, redirectUri: parsed.redirectUri || null };
  } catch {
    return { valid: false, redirectUri: null };
  }
}

export function generateGoogleAuthUrl(customRedirectUri = null) {
  const { google: gConfig } = getEnvConfig();
  if (!gConfig.isConfigured) {
    return {
      ok: false,
      error:
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are missing in environment variables. Configure them in .env to initiate Google OAuth 2.0.',
    };
  }
  const redirectUri = customRedirectUri || resolveGoogleRedirectUri();
  const oauth2Client = getOAuth2Client(redirectUri);
  const state = createSignedOAuthState(redirectUri);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: gConfig.scopes,
    redirect_uri: redirectUri,
    state,
  });
  return { ok: true, url, state, redirectUri };
}

/**
 * Finds an existing non-trashed folder by name in Google Drive root, or creates it if missing.
 */
export async function findOrCreateDriveFolder(drive, folderName) {
  const safeName = folderName.replace(/'/g, "\\'");
  const listRes = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 5,
  });

  if (listRes.data?.files && listRes.data.files.length > 0) {
    return listRes.data.files[0].id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id, name',
  });

  if (!createRes.data?.id) {
    throw new Error(`Failed to create "${folderName}" folder in Google Drive.`);
  }

  return createRes.data.id;
}

/**
 * Automatically creates or locates the "Musics" and "Images" folders in the connected Google Drive
 * and saves their folder IDs in the database.
 */
export async function ensureDriveMediaFolders(driveClient = null) {
  const { drive } = driveClient ? { drive: driveClient } : await getAuthenticatedDriveClient();
  const musicFolderId = await findOrCreateDriveFolder(drive, DRIVE_MUSIC_FOLDER_NAME);
  const imageFolderId = await findOrCreateDriveFolder(drive, DRIVE_IMAGE_FOLDER_NAME);
  const now = new Date().toISOString();

  await updateDbState((state) => {
    const integration = state.googleIntegrations?.[0];
    if (integration) {
      integration.musicFolderId = musicFolderId;
      integration.musicFolderName = DRIVE_MUSIC_FOLDER_NAME;
      integration.imageFolderId = imageFolderId;
      integration.imageFolderName = DRIVE_IMAGE_FOLDER_NAME;
      integration.uploadFolderId = musicFolderId;
      integration.uploadFolderName = DRIVE_MUSIC_FOLDER_NAME;
      integration.updatedAt = now;
    }
  });

  return {
    musicFolderId,
    musicFolderName: DRIVE_MUSIC_FOLDER_NAME,
    imageFolderId,
    imageFolderName: DRIVE_IMAGE_FOLDER_NAME,
  };
}

export async function handleGoogleOAuthCallback(code, customRedirectUri = null) {
  const oauth2Client = getOAuth2Client(customRedirectUri);
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  let accountEmail = 'Connected Google Drive Account';
  try {
    const aboutRes = await drive.about.get({ fields: 'user(emailAddress,displayName)' });
    if (aboutRes.data?.user?.emailAddress) {
      accountEmail = aboutRes.data.user.emailAddress;
    }
  } catch {
    // Fallback if user email is restricted by scope
  }

  const db = await getDbState();
  const existingIntegration = db.googleIntegrations?.[0];
  const refreshTokenToStore =
    tokens.refresh_token ||
    (existingIntegration?.encryptedRefreshToken
      ? decryptSecret(existingIntegration.encryptedRefreshToken)
      : '');

  if (!refreshTokenToStore && !tokens.access_token) {
    throw new Error('Google OAuth did not return a valid refresh or access token.');
  }

  // Automatically create/locate "Musics" and "Images" folders in the connected Google Drive
  const musicFolderId = await findOrCreateDriveFolder(drive, DRIVE_MUSIC_FOLDER_NAME);
  const imageFolderId = await findOrCreateDriveFolder(drive, DRIVE_IMAGE_FOLDER_NAME);

  const encryptedToken = encryptSecret(refreshTokenToStore || tokens.access_token);
  const now = new Date().toISOString();

  await updateDbState((state) => {
    const integration = state.googleIntegrations[0];
    if (integration) {
      integration.accountEmail = accountEmail;
      integration.encryptedRefreshToken = encryptedToken;
      integration.musicFolderId = musicFolderId;
      integration.musicFolderName = DRIVE_MUSIC_FOLDER_NAME;
      integration.imageFolderId = imageFolderId;
      integration.imageFolderName = DRIVE_IMAGE_FOLDER_NAME;
      integration.uploadFolderId = musicFolderId;
      integration.uploadFolderName = DRIVE_MUSIC_FOLDER_NAME;
      integration.connected = true;
      integration.connectedAt = now;
      integration.updatedAt = now;
    }
  });

  await logAuditEvent({
    action: 'GOOGLE_DRIVE_CONNECTED',
    entityType: 'GoogleIntegration',
    entityId: 'gdrive-primary',
    metadata: {
      accountEmail,
      musicFolderId,
      imageFolderId,
    },
  });

  return { accountEmail, musicFolderId, imageFolderId, connectedAt: now };
}

export async function getAuthenticatedDriveClient() {
  const db = await getDbState();
  const integration = db.googleIntegrations?.[0];
  if (!integration || !integration.connected || !integration.encryptedRefreshToken) {
    throw new Error(
      'Google Drive is not connected. Please connect a Google account in Admin > Integrations > Google Drive first.'
    );
  }

  const oauth2Client = getOAuth2Client();
  const refreshToken = decryptSecret(integration.encryptedRefreshToken);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return { drive, integration };
}

export async function uploadMp3ToGoogleDrive({ buffer, fileName, mimeType = 'audio/mpeg' }) {
  const { drive, integration } = await getAuthenticatedDriveClient();

  let targetMusicFolderId = integration.musicFolderId || integration.uploadFolderId || '';
  if (!targetMusicFolderId) {
    const folders = await ensureDriveMediaFolders(drive);
    targetMusicFolderId = folders.musicFolderId;
  }

  const requestBody = {
    name: fileName,
    mimeType,
    parents: [targetMusicFolderId],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const createRes = await drive.files.create({
    requestBody,
    media,
    fields: 'id, name, size, mimeType, webContentLink, webViewLink',
  });

  const fileId = createRes.data.id;
  if (!fileId) {
    throw new Error('Google Drive API did not return a file ID after MP3 upload.');
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      type: 'anyone',
      role: 'reader',
    },
  });

  const now = new Date().toISOString();
  await updateDbState((state) => {
    if (state.googleIntegrations?.[0]) {
      state.googleIntegrations[0].lastUploadAt = now;
      state.googleIntegrations[0].lastUploadStatus = 'succeeded';
      state.googleIntegrations[0].updatedAt = now;
    }
  });

  return {
    fileId,
    folderId: targetMusicFolderId,
    fileName: createRes.data.name || fileName,
    fileSize: Number(createRes.data.size || buffer.length),
    mimeType: createRes.data.mimeType || mimeType,
  };
}

export async function uploadImageToGoogleDrive({ buffer, fileName, mimeType = 'image/jpeg' }) {
  const { drive, integration } = await getAuthenticatedDriveClient();

  let targetImageFolderId = integration.imageFolderId || '';
  if (!targetImageFolderId) {
    const folders = await ensureDriveMediaFolders(drive);
    targetImageFolderId = folders.imageFolderId;
  }

  const requestBody = {
    name: fileName,
    mimeType,
    parents: [targetImageFolderId],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const createRes = await drive.files.create({
    requestBody,
    media,
    fields: 'id, name, size, mimeType, webContentLink, webViewLink',
  });

  const fileId = createRes.data.id;
  if (!fileId) {
    throw new Error('Google Drive API did not return a file ID after image upload.');
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      type: 'anyone',
      role: 'reader',
    },
  });

  const now = new Date().toISOString();
  await updateDbState((state) => {
    if (state.googleIntegrations?.[0]) {
      state.googleIntegrations[0].lastUploadAt = now;
      state.googleIntegrations[0].lastUploadStatus = 'succeeded';
      state.googleIntegrations[0].updatedAt = now;
    }
  });

  return {
    fileId,
    folderId: targetImageFolderId,
    url: `/api/media/${fileId}`,
    fileName: createRes.data.name || fileName,
    fileSize: Number(createRes.data.size || buffer.length),
    mimeType: createRes.data.mimeType || mimeType,
  };
}

export async function deleteFileFromGoogleDrive(fileId) {
  if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
    return { deleted: false };
  }
  const cleanId = fileId.trim();
  try {
    const { drive } = await getAuthenticatedDriveClient();
    await drive.files.delete({ fileId: cleanId });
    return { deleted: true, fileId: cleanId };
  } catch (err) {
    const status = err?.code || err?.response?.status;
    if (status === 404) {
      return { deleted: true, fileId: cleanId };
    }
    console.error('Failed to cleanup Google Drive file:', err?.message || err);
    return { deleted: false, fileId: cleanId };
  }
}

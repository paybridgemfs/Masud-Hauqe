import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, logAuditEvent } from '@/lib/db.js';
import { getEnvConfig } from '@/lib/env.js';
import {
  generateGoogleAuthUrl,
  ensureDriveMediaFolders,
  DRIVE_MUSIC_FOLDER_NAME,
  DRIVE_IMAGE_FOLDER_NAME,
} from '@/lib/google-drive.js';

const OAUTH_STATE_COOKIE = 'mh_google_oauth_state';

export async function GET() {
  const { authorized } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDbState();
  const env = getEnvConfig();
  const integration = db.googleIntegrations?.[0] || {};

  return NextResponse.json({
    ok: true,
    envConfigured: env.google.isConfigured,
    redirectUri: env.google.redirectUri,
    scopes: env.google.scopes,
    youtubeConfigured: env.youtube.isConfigured,
    integration: {
      provider: integration.provider || 'google_drive',
      connected: Boolean(integration.connected),
      accountEmail: integration.accountEmail || '',
      musicFolderId: integration.musicFolderId || integration.uploadFolderId || '',
      musicFolderName: integration.musicFolderName || DRIVE_MUSIC_FOLDER_NAME,
      imageFolderId: integration.imageFolderId || '',
      imageFolderName: integration.imageFolderName || DRIVE_IMAGE_FOLDER_NAME,
      uploadFolderId: integration.musicFolderId || integration.uploadFolderId || '',
      uploadFolderName: integration.musicFolderName || DRIVE_MUSIC_FOLDER_NAME,
      connectedAt: integration.connectedAt || null,
      lastUploadAt: integration.lastUploadAt || null,
      lastUploadStatus: integration.lastUploadStatus || 'idle',
    },
  });
}

export async function POST(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === 'connect') {
    const authResult = generateGoogleAuthUrl();
    if (!authResult.ok) {
      return NextResponse.json({ ok: false, error: authResult.error }, { status: 400 });
    }
    const proto = request.headers.get('x-forwarded-proto') || '';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const https = proto.includes('https') || host.includes('.run.app');
    const cookieStore = await cookies();
    cookieStore.set(OAUTH_STATE_COOKIE, authResult.state, {
      httpOnly: true,
      secure: https,
      sameSite: https ? 'none' : 'lax',
      ...(https ? { partitioned: true } : {}),
      path: '/',
      maxAge: 600,
    });
    return NextResponse.json({ ok: true, authUrl: authResult.url });
  }

  if (body.action === 'ensureFolders') {
    try {
      const folders = await ensureDriveMediaFolders();
      await logAuditEvent({
        adminId: admin.id,
        action: 'GOOGLE_DRIVE_FOLDERS_VERIFIED',
        entityType: 'GoogleIntegration',
        entityId: 'gdrive-primary',
        metadata: folders,
      });
      return NextResponse.json({
        ok: true,
        folders,
        message: 'Google Drive "Musics" and "Images" folders verified and saved in database.',
      });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to create or verify Google Drive folders.',
        },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ ok: false, error: 'Unsupported action.' }, { status: 400 });
}

export async function DELETE() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  await updateDbState((state) => {
    const target = state.googleIntegrations[0];
    if (target) {
      target.connected = false;
      target.accountEmail = '';
      target.encryptedRefreshToken = '';
      target.musicFolderId = '';
      target.imageFolderId = '';
      target.uploadFolderId = '';
      target.connectedAt = null;
      target.updatedAt = new Date().toISOString();
    }
  });

  await logAuditEvent({
    adminId: admin.id,
    action: 'GOOGLE_DRIVE_DISCONNECTED',
    entityType: 'GoogleIntegration',
    entityId: 'gdrive-primary',
  });

  return NextResponse.json({ ok: true, message: 'Google Drive account disconnected.' });
}

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import {
  getDbState,
  updateDbState,
  appendAuditRecord,
  createUniqueSlug,
  cuid,
  sortAlbumTracks,
} from '@/lib/db.js';
import { musicSchema } from '@/lib/validation.js';
import { sanitizeFilename, verifyMp3Signature } from '@/lib/security.js';
import { getEnvConfig } from '@/lib/env.js';
import { uploadMp3ToGoogleDrive, deleteFileFromGoogleDrive } from '@/lib/google-drive.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'public';
  const search = (searchParams.get('q') || '').trim().toLowerCase();
  const albumId = searchParams.get('albumId') || '';
  const sort = searchParams.get('sort') || 'latest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));

  const db = await getDbState();
  const artist = db.artists?.[0] || { id: 'masud-hauqe', name: 'Masud Hauqe', slug: 'masud-hauqe' };
  const albumMap = new Map((db.albums || []).map((a) => [a.id, a]));

  if (scope === 'admin') {
    const { authorized } = await requireAdminSession();
    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const allMusic = (db.music || []).map((m) => ({
      ...m,
      artist,
      album: m.albumId ? albumMap.get(m.albumId) || null : null,
    }));
    return NextResponse.json({ ok: true, music: allMusic, total: allMusic.length });
  }

  let items = (db.music || [])
    .filter((m) => m.isPublished)
    .map((m) => ({
      ...m,
      artist,
      album: m.albumId ? albumMap.get(m.albumId) || null : null,
    }));

  if (search) {
    items = items.filter(
      (m) =>
        m.title.toLowerCase().includes(search) ||
        (m.album?.title || '').toLowerCase().includes(search)
    );
  }

  if (albumId) {
    items = items.filter((m) => m.albumId === albumId);
  }

  if (sort === 'popular') {
    items.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  } else if (albumId) {
    items = sortAlbumTracks(items);
  } else {
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = items.length;
  const start = (page - 1) * limit;
  const paginated = items.slice(start, start + limit);

  return NextResponse.json({
    ok: true,
    music: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let uploadedDriveFileId = null;

  try {
    const contentType = request.headers.get('content-type') || '';
    const env = getEnvConfig();
    const db = await getDbState();
    const integration = db.googleIntegrations?.[0];

    let payload = {};
    let fileBuffer = null;
    let originalFileName = '';
    let fileMimeType = 'audio/mpeg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const mp3File = formData.get('mp3File');
      payload = {
        title: String(formData.get('title') || ''),
        artistName: String(formData.get('artistName') || ''),
        albumId: String(formData.get('albumId') || ''),
        thumbnail: String(formData.get('thumbnail') || ''),
        thumbnailFileId: String(formData.get('thumbnailFileId') || ''),
        youtubeUrl: String(formData.get('youtubeUrl') || ''),
        youtubeVideoId: String(formData.get('youtubeVideoId') || ''),
        duration: String(formData.get('duration') || '0:00'),
        isPublished: formData.get('isPublished') === 'true',
        downloadEnabled: formData.get('downloadEnabled') !== 'false',
        includeYoutubeVideo: formData.get('includeYoutubeVideo') === 'true',
      };

      if (!mp3File || typeof mp3File === 'string') {
        return NextResponse.json(
          { ok: false, error: 'An original/authorized MP3 file is required.' },
          { status: 400 }
        );
      }

      originalFileName = mp3File.name || 'track.mp3';
      fileMimeType = mp3File.type || 'audio/mpeg';

      if (!originalFileName.toLowerCase().endsWith('.mp3')) {
        return NextResponse.json(
          { ok: false, error: 'Invalid file extension. Only .mp3 audio files are accepted.' },
          { status: 400 }
        );
      }

      const validMimes = ['audio/mpeg', 'audio/mp3', 'application/octet-stream'];
      if (fileMimeType && !validMimes.includes(fileMimeType)) {
        return NextResponse.json(
          { ok: false, error: `Unsupported MIME type "${fileMimeType}". Please upload a valid MP3 file.` },
          { status: 400 }
        );
      }

      if (mp3File.size > env.upload.maxFileSizeBytes) {
        return NextResponse.json(
          {
            ok: false,
            error: `File size exceeds maximum limit of ${env.upload.maxFileSizeMb} MB.`,
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await mp3File.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      const sigCheck = verifyMp3Signature(fileBuffer);
      if (!sigCheck.valid) {
        return NextResponse.json(
          { ok: false, error: sigCheck.reason },
          { status: 400 }
        );
      }
    } else {
      payload = await request.json();
    }

    const parsed = musicSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Invalid music metadata.' },
        { status: 400 }
      );
    }

    // Verify Google Drive connection before uploading MP3
    if (fileBuffer) {
      if (!integration || !integration.connected) {
        return NextResponse.json(
          {
            ok: false,
            code: 'GOOGLE_DRIVE_DISCONNECTED',
            error:
              'Google Drive is not connected. Please connect your Google Drive account in Admin > Integrations > Google Drive before uploading MP3 files.',
          },
          { status: 400 }
        );
      }

      const safeFileName = sanitizeFilename(originalFileName);
      const driveResult = await uploadMp3ToGoogleDrive({
        buffer: fileBuffer,
        fileName: safeFileName,
        mimeType: 'audio/mpeg',
      });

      uploadedDriveFileId = driveResult.fileId;
      parsed.data.audioFileId = driveResult.fileId;
      parsed.data.audioFileName = driveResult.fileName;
      parsed.data.audioFileSize = driveResult.fileSize;
      parsed.data.audioMimeType = 'audio/mpeg';
      parsed.data.uploadStatus = parsed.data.isPublished ? 'published' : 'uploaded';
    } else if (!parsed.data.audioFileId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Cannot publish music without an uploaded MP3 file in Google Drive. Please select an MP3 file and connect Google Drive.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let createdRecord = null;

    await updateDbState(async (state) => {
      const slug = await createUniqueSlug(state.music, parsed.data.title);
      const artistId = state.artists[0]?.id || 'masud-hauqe';
      const targetAlbumId = parsed.data.albumId || null;
      let nextTrackOrder = 0;
      if (targetAlbumId) {
        const albumTracks = (state.music || []).filter((m) => m.albumId === targetAlbumId);
        const maxOrder = albumTracks.reduce(
          (max, m) => Math.max(max, Number(m.trackOrder) || 0),
          albumTracks.length
        );
        nextTrackOrder = maxOrder + 1;
      }

      createdRecord = {
        id: cuid(),
        title: parsed.data.title,
        slug,
        artistId,
        albumId: targetAlbumId,
        trackOrder: nextTrackOrder,
        thumbnail: parsed.data.thumbnail || '',
        thumbnailFileId: parsed.data.thumbnailFileId || '',
        youtubeUrl: parsed.data.youtubeUrl || '',
        youtubeVideoId: parsed.data.youtubeVideoId || '',
        duration: parsed.data.duration || '0:00',
        audioProvider: 'google_drive',
        audioFileId: parsed.data.audioFileId,
        audioFileName: parsed.data.audioFileName,
        audioMimeType: parsed.data.audioMimeType || 'audio/mpeg',
        audioFileSize: parsed.data.audioFileSize || 0,
        uploadStatus: parsed.data.isPublished ? 'published' : 'uploaded',
        isPublished: Boolean(parsed.data.isPublished),
        downloadEnabled: Boolean(parsed.data.downloadEnabled),
        includeYoutubeVideo: Boolean(parsed.data.includeYoutubeVideo),
        playCount: 0,
        downloadCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      state.music.unshift(createdRecord);
      appendAuditRecord(state, {
        adminId: admin.id,
        action: 'MUSIC_CREATED',
        entityType: 'Music',
        entityId: createdRecord.id,
        metadata: {
          title: createdRecord.title,
          audioFileId: createdRecord.audioFileId,
          isPublished: createdRecord.isPublished,
        },
      });
    });

    revalidatePath('/');
    revalidatePath('/music');
    revalidatePath('/releases');
    revalidatePath('/videos');

    return NextResponse.json({ ok: true, music: createdRecord });
  } catch (err) {
    // Cleanup orphaned Google Drive file if DB save failed
    if (uploadedDriveFileId) {
      await deleteFileFromGoogleDrive(uploadedDriveFileId);
    }
    console.error('Music upload/save error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to upload and save music record.',
      },
      { status: 500 }
    );
  }
}

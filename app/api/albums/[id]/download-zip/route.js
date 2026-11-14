import { NextResponse } from 'next/server';
import { getDbState, updateDbState, sortAlbumTracks } from '@/lib/db.js';
import { requireAdminSession } from '@/lib/auth.js';
import { getAuthenticatedDriveClient } from '@/lib/google-drive.js';
import {
  getTrackDownloadFilename,
  getReleaseZipFilename,
} from '@/lib/storage/audio-delivery.js';
import { buildZipArchive } from '@/lib/zip-builder.js';
import { embedMp3MetadataAndCover } from '@/lib/mp3-id3.js';

const CACHE_TTL_MS = 30 * 60 * 1000;

function getAudioCache() {
  if (!globalThis.__masudAudioBufferCache) {
    globalThis.__masudAudioBufferCache = new Map();
  }
  return globalThis.__masudAudioBufferCache;
}

async function fetchDriveAudioBuffer(drive, fileId) {
  const cache = getAudioCache();
  const now = Date.now();
  const cached = cache.get(fileId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.buffer?.length > 0) {
    return cached.buffer;
  }

  const driveRes = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  const buf = Buffer.from(driveRes.data);
  if (buf.length > 0) {
    if (cache.size >= 8) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(fileId, { buffer: buf, timestamp: Date.now() });
  }
  return buf;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const db = await getDbState();

  let album = (db.albums || []).find((a) => (a.id === id || a.slug === id) && a.isPublished);
  let isAdmin = false;

  if (!album) {
    const { authorized } = await requireAdminSession();
    if (authorized) {
      isAdmin = true;
      album = (db.albums || []).find((a) => a.id === id || a.slug === id);
    }
  }

  if (!album) {
    return NextResponse.json(
      { ok: false, error: 'Release not found.' },
      { status: 404 }
    );
  }

  const tracks = sortAlbumTracks(
    (db.music || []).filter(
      (m) =>
        m.albumId === album.id &&
        (isAdmin ? true : m.isPublished) &&
        m.downloadEnabled !== false &&
        Boolean(m.audioFileId)
    )
  );

  if (tracks.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No downloadable MP3 tracks are available in this release.',
      },
      { status: 404 }
    );
  }

  try {
    const { drive } = await getAuthenticatedDriveClient();
    const artist = db.artists?.[0] || { name: 'Masud Hauqe' };
    const usedNames = new Set();
    const zipEntries = [];

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const rawBuf = await fetchDriveAudioBuffer(drive, track.audioFileId);
      if (!rawBuf || rawBuf.length === 0) continue;

      const taggedBuf = await embedMp3MetadataAndCover(rawBuf, {
        track: {
          ...track,
          trackOrder: track.trackOrder || i + 1,
        },
        album,
        artist,
        totalAlbumTracks: tracks.length,
      });

      let entryName = getTrackDownloadFilename(track);
      if (usedNames.has(entryName.toLowerCase())) {
        const base = entryName.replace(/\.mp3$/i, '');
        entryName = `${String(i + 1).padStart(2, '0')} - ${base}.mp3`;
      }
      usedNames.add(entryName.toLowerCase());

      zipEntries.push({
        name: entryName,
        data: taggedBuf,
      });
    }

    if (zipEntries.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Could not retrieve MP3 files from Google Drive for this release.' },
        { status: 502 }
      );
    }

    // Increment download count on downloaded tracks
    const downloadedTrackIds = new Set(tracks.map((t) => t.id));
    updateDbState((state) => {
      for (const m of state.music || []) {
        if (downloadedTrackIds.has(m.id)) {
          m.downloadCount = (m.downloadCount || 0) + 1;
        }
      }
    }).catch(() => {});

    const zipBuffer = buildZipArchive(zipEntries);
    const zipFileName = getReleaseZipFilename(album);
    const asciiFallback =
      zipFileName
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\]/g, '')
        .trim() || `${album.slug || 'release'}.zip`;
    const encodedUtf8 = encodeURIComponent(zipFileName);

    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedUtf8}`
    );
    headers.set('Content-Length', String(zipBuffer.length));
    headers.set('Cache-Control', 'no-store');

    return new NextResponse(zipBuffer, { status: 200, headers });
  } catch (err) {
    console.error('Release ZIP download error:', err);
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to package Release ZIP archive from Google Drive.',
      },
      { status: 502 }
    );
  }
}

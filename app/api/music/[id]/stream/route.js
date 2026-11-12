import { NextResponse } from 'next/server';
import { getDbState, updateDbState } from '@/lib/db.js';
import { requireAdminSession } from '@/lib/auth.js';
import { getAuthenticatedDriveClient } from '@/lib/google-drive.js';
import { getGoogleDriveDirectDownloadUrl } from '@/lib/storage/audio-delivery.js';

const MAX_CACHE_ENTRIES = 8;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getAudioCache() {
  if (!globalThis.__masudAudioBufferCache) {
    globalThis.__masudAudioBufferCache = new Map();
  }
  return globalThis.__masudAudioBufferCache;
}

function getInFlightMap() {
  if (!globalThis.__masudAudioInFlight) {
    globalThis.__masudAudioInFlight = new Map();
  }
  return globalThis.__masudAudioInFlight;
}

async function fetchOrGetCachedAudioBuffer(fileId) {
  const cache = getAudioCache();
  const now = Date.now();
  const cached = cache.get(fileId);

  if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.buffer?.length > 0) {
    // Refresh LRU order
    cache.delete(fileId);
    cached.timestamp = now;
    cache.set(fileId, cached);
    return cached.buffer;
  }

  const inFlight = getInFlightMap();
  if (inFlight.has(fileId)) {
    return inFlight.get(fileId);
  }

  const promise = (async () => {
    try {
      const { drive } = await getAuthenticatedDriveClient();
      const driveRes = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      const fullBuffer = Buffer.from(driveRes.data);

      if (fullBuffer.length > 0) {
        if (cache.size >= MAX_CACHE_ENTRIES) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey) cache.delete(oldestKey);
        }
        cache.set(fileId, {
          buffer: fullBuffer,
          timestamp: Date.now(),
        });
      }

      return fullBuffer;
    } finally {
      inFlight.delete(fileId);
    }
  })();

  inFlight.set(fileId, promise);
  return promise;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get('download') === '1';

  const db = await getDbState();
  let track = (db.music || []).find((m) => (m.id === id || m.slug === id) && m.isPublished);

  // Allow authenticated Admin to preview draft tracks before publishing
  if (!track) {
    const { authorized } = await requireAdminSession();
    if (authorized) {
      track = (db.music || []).find((m) => m.id === id || m.slug === id);
    }
  }

  if (!track || !track.audioFileId) {
    return NextResponse.json(
      { ok: false, error: 'Requested audio recording was not found or has no valid Google Drive file ID.' },
      { status: 404 }
    );
  }

  if (isDownload && !track.downloadEnabled) {
    return NextResponse.json(
      { ok: false, error: 'MP3 download is disabled for this track by the artist.' },
      { status: 403 }
    );
  }

  const rangeHeader = request.headers.get('range');
  const shouldIncrementCounter =
    isDownload || !rangeHeader || rangeHeader.startsWith('bytes=0-');

  if (shouldIncrementCounter) {
    updateDbState((state) => {
      const target = state.music.find((m) => m.id === track.id);
      if (target) {
        if (isDownload) {
          target.downloadCount = (target.downloadCount || 0) + 1;
        } else {
          target.playCount = (target.playCount || 0) + 1;
        }
      }
    }).catch(() => {});
  }

  try {
    const fullBuffer = await fetchOrGetCachedAudioBuffer(track.audioFileId);
    const totalLength = fullBuffer.length;
    const headers = new Headers();
    headers.set('Content-Type', track.audioMimeType || 'audio/mpeg');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=3600');

    if (isDownload) {
      const safeName = (track.audioFileName || `${track.slug}.mp3`).replace(/[^a-zA-Z0-9._-]/g, '_');
      headers.set('Content-Disposition', `attachment; filename="${safeName}"`);
      headers.set('Content-Length', String(totalLength));
      return new NextResponse(fullBuffer, { status: 200, headers });
    }

    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const requestedEnd = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;
      const end = Math.min(requestedEnd, totalLength - 1);

      if (start >= totalLength || start > end) {
        headers.set('Content-Range', `bytes */${totalLength}`);
        return new NextResponse(null, { status: 416, headers });
      }

      const chunk = fullBuffer.subarray(start, end + 1);
      headers.set('Content-Range', `bytes ${start}-${end}/${totalLength}`);
      headers.set('Content-Length', String(chunk.length));
      return new NextResponse(chunk, { status: 206, headers });
    }

    headers.set('Content-Length', String(totalLength));
    return new NextResponse(fullBuffer, { status: 200, headers });
  } catch {
    const publicUrl = getGoogleDriveDirectDownloadUrl(track.audioFileId);
    if (publicUrl) {
      return NextResponse.redirect(publicUrl, 307);
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'Unable to stream audio from Google Drive. Verify file permissions and quota.',
      },
      { status: 502 }
    );
  }
}

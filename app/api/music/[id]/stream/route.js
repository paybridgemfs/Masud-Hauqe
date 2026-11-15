import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { getDbState, updateDbState } from '@/lib/db.js';
import { requireAdminSession } from '@/lib/auth.js';
import { getAuthenticatedDriveClient } from '@/lib/google-drive.js';
import {
  getGoogleDriveDirectDownloadUrl,
  getTrackDownloadFilename,
} from '@/lib/storage/audio-delivery.js';
import { embedMp3MetadataAndCover } from '@/lib/mp3-id3.js';
import { checkStreamPlayDedupe, getClientIp } from '@/lib/security.js';

const MAX_CACHE_ENTRIES = 8;
const MAX_CACHED_FILE_BYTES = 25 * 1024 * 1024;
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

function getCachedAudioBuffer(fileId) {
  const cache = getAudioCache();
  const now = Date.now();
  const cached = cache.get(fileId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.buffer?.length > 0) {
    cache.delete(fileId);
    cached.timestamp = now;
    cache.set(fileId, cached);
    return cached.buffer;
  }
  if (cached) {
    cache.delete(fileId);
  }
  return null;
}

function storeAudioCacheBuffer(fileId, buffer) {
  if (!buffer || buffer.length === 0 || buffer.length > MAX_CACHED_FILE_BYTES) return;
  const cache = getAudioCache();
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(fileId)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(fileId, {
    buffer,
    timestamp: Date.now(),
  });
}

async function fetchOrGetCachedAudioBuffer(fileId) {
  const cached = getCachedAudioBuffer(fileId);
  if (cached) return cached;

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
      storeAudioCacheBuffer(fileId, fullBuffer);
      return fullBuffer;
    } finally {
      inFlight.delete(fileId);
    }
  })();

  inFlight.set(fileId, promise);
  return promise;
}

function readHeaderValue(headersObj, name) {
  if (!headersObj) return '';
  if (typeof headersObj.get === 'function') {
    return headersObj.get(name) || '';
  }
  const lower = name.toLowerCase();
  return headersObj[lower] || headersObj[name] || '';
}

function toNodeReadable(streamData) {
  if (!streamData) return null;
  if (typeof streamData.on === 'function' && typeof streamData.pipe === 'function') {
    return streamData;
  }
  if (typeof streamData.getReader === 'function' && typeof Readable.fromWeb === 'function') {
    return Readable.fromWeb(streamData);
  }
  return null;
}

function createProgressiveWebStream({
  nodeStream,
  abortSignal,
  cacheOnCompleteFileId = '',
  expectedTotalBytes = 0,
}) {
  let cleanedUp = false;
  let collectedChunks = cacheOnCompleteFileId ? [] : null;
  let collectedLength = 0;

  const cleanupListeners = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    nodeStream.removeAllListeners?.('data');
    nodeStream.removeAllListeners?.('end');
    nodeStream.removeAllListeners?.('error');
    if (abortSignal) {
      abortSignal.removeEventListener('abort', onAbort);
    }
  };

  const onAbort = () => {
    collectedChunks = null;
    cleanupListeners();
    try {
      nodeStream.destroy?.();
    } catch {
      // Ignore destroy errors
    }
  };

  return new ReadableStream({
    start(controller) {
      let controllerClosed = false;

      if (abortSignal) {
        if (abortSignal.aborted) {
          onAbort();
          controller.close();
          controllerClosed = true;
          return;
        }
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      nodeStream.on('data', (chunk) => {
        if (controllerClosed) return;
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (buf.length === 0) return;

        // Forward chunk downstream immediately so playback begins without waiting for full file
        controller.enqueue(new Uint8Array(buf));

        // Optional non-blocking RAM cache tee for replay & instant seeks
        if (collectedChunks !== null) {
          collectedLength += buf.length;
          if (collectedLength <= MAX_CACHED_FILE_BYTES) {
            collectedChunks.push(buf);
          } else {
            collectedChunks = null;
          }
        }
      });

      nodeStream.on('end', () => {
        if (
          collectedChunks !== null &&
          collectedLength > 0 &&
          (!expectedTotalBytes || collectedLength === expectedTotalBytes)
        ) {
          storeAudioCacheBuffer(cacheOnCompleteFileId, Buffer.concat(collectedChunks, collectedLength));
        }
        collectedChunks = null;
        cleanupListeners();
        if (!controllerClosed) {
          controllerClosed = true;
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      });

      nodeStream.on('error', (err) => {
        collectedChunks = null;
        cleanupListeners();
        if (!controllerClosed) {
          controllerClosed = true;
          try {
            controller.error(err);
          } catch {
            // Already closed
          }
        }
      });
    },
    cancel() {
      onAbort();
    },
  });
}

function serveBufferWithRange(fullBuffer, rangeHeader, headers) {
  const totalLength = fullBuffer.length;
  if (rangeHeader && /^bytes=\d*-\d*$/i.test(rangeHeader.trim())) {
    const parts = rangeHeader.trim().replace(/^bytes=/i, '').split('-');
    let start = parts[0] ? parseInt(parts[0], 10) : 0;
    let end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

    if (!parts[0] && parts[1]) {
      // Suffix byte-range: bytes=-500
      const suffixLen = parseInt(parts[1], 10);
      start = Math.max(0, totalLength - suffixLen);
      end = totalLength - 1;
    } else {
      end = Math.min(end, totalLength - 1);
    }

    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start >= totalLength || start > end) {
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

  const rawRangeHeader = request.headers.get('range');
  const validRangeHeader =
    rawRangeHeader && /^bytes=\d*-\d*$/i.test(rawRangeHeader.trim())
      ? rawRangeHeader.trim()
      : null;

  const ip = getClientIp(request);
  const isInitialStreamRequest = !validRangeHeader || /^bytes=0-/i.test(validRangeHeader);
  const shouldIncrementCounter =
    isDownload ||
    (isInitialStreamRequest && checkStreamPlayDedupe(`stream:${ip}:${track.id}`, 45 * 1000));

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
    const headers = new Headers();
    headers.set('Content-Type', track.audioMimeType || 'audio/mpeg');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=3600');

    // Downloads require full buffer to embed ID3v2.3 tags and front cover artwork
    if (isDownload) {
      const fullBuffer = await fetchOrGetCachedAudioBuffer(track.audioFileId);
      const artist = db.artists?.[0] || { name: 'Masud Hauqe' };
      const album = track.albumId
        ? (db.albums || []).find((a) => a.id === track.albumId) || null
        : null;
      const totalAlbumTracks = album
        ? (db.music || []).filter((m) => m.albumId === album.id && m.isPublished).length
        : 0;

      const taggedBuffer = await embedMp3MetadataAndCover(fullBuffer, {
        track,
        album,
        artist,
        totalAlbumTracks,
      });

      const downloadFileName = getTrackDownloadFilename(track);
      const asciiFallback =
        downloadFileName
          .replace(/[^\x20-\x7E]/g, '_')
          .replace(/["\\]/g, '')
          .trim() || `${track.slug || 'track'}.mp3`;
      const encodedUtf8 = encodeURIComponent(downloadFileName);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      headers.set(
        'Content-Disposition',
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedUtf8}`
      );
      headers.set('Content-Length', String(taggedBuffer.length));
      return new NextResponse(taggedBuffer, { status: 200, headers });
    }

    // Fast path: if already cached in memory, serve requested range immediately
    const cachedBuffer = getCachedAudioBuffer(track.audioFileId);
    if (cachedBuffer) {
      return serveBufferWithRange(cachedBuffer, validRangeHeader, headers);
    }

    // True progressive streaming path from Google Drive with HTTP Range pass-through
    const { drive } = await getAuthenticatedDriveClient();
    const upstreamHeaders = {};
    if (validRangeHeader) {
      upstreamHeaders.Range = validRangeHeader;
    }

    const driveRes = await drive.files.get(
      { fileId: track.audioFileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: upstreamHeaders,
        signal: request.signal,
      }
    );

    const nodeStream = toNodeReadable(driveRes.data);
    if (!nodeStream) {
      throw new Error('Google Drive returned an unsupported audio stream object.');
    }

    const upstreamContentRange = readHeaderValue(driveRes.headers, 'content-range');
    const upstreamContentLength = readHeaderValue(driveRes.headers, 'content-length');
    const upstreamContentType = readHeaderValue(driveRes.headers, 'content-type');

    if (upstreamContentType && upstreamContentType.startsWith('audio/')) {
      headers.set('Content-Type', track.audioMimeType || upstreamContentType);
    }

    const isPartial = driveRes.status === 206 && Boolean(upstreamContentRange);
    if (isPartial) {
      headers.set('Content-Range', upstreamContentRange);
    }
    if (upstreamContentLength) {
      headers.set('Content-Length', String(upstreamContentLength));
    }

    // Parse expected total length when streaming full file from byte 0 so cache stays 100% consistent
    const isFullStartStream =
      !validRangeHeader || /^bytes=0-\s*$/i.test(validRangeHeader);
    const parsedLength = parseInt(upstreamContentLength, 10) || 0;
    let shouldCacheStream = isFullStartStream && parsedLength > 0 && parsedLength <= MAX_CACHED_FILE_BYTES;
    if (isPartial && upstreamContentRange) {
      const rangeMatch = upstreamContentRange.match(/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i);
      if (rangeMatch) {
        const rangeStart = parseInt(rangeMatch[1], 10);
        const rangeEnd = parseInt(rangeMatch[2], 10);
        const totalBytes = rangeMatch[3] === '*' ? 0 : parseInt(rangeMatch[3], 10);
        shouldCacheStream =
          rangeStart === 0 &&
          totalBytes > 0 &&
          rangeEnd === totalBytes - 1 &&
          totalBytes <= MAX_CACHED_FILE_BYTES;
      } else {
        shouldCacheStream = false;
      }
    }

    const webStream = createProgressiveWebStream({
      nodeStream,
      abortSignal: request.signal,
      cacheOnCompleteFileId: shouldCacheStream ? track.audioFileId : '',
      expectedTotalBytes: parsedLength,
    });

    return new NextResponse(webStream, {
      status: isPartial ? 206 : 200,
      headers,
    });
  } catch (err) {
    if (request.signal?.aborted || err?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    const errStatus = err?.status || err?.code || err?.response?.status;
    if (errStatus === 416) {
      const headers = new Headers();
      headers.set('Accept-Ranges', 'bytes');
      return new NextResponse(null, { status: 416, headers });
    }
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

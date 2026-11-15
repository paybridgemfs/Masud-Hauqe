import { NextResponse } from 'next/server';
import { getDbState, updateDbState } from '@/lib/db.js';
import { requireAdminSession } from '@/lib/auth.js';
import { getGoogleDriveAccessToken } from '@/lib/google-drive.js';
import { getTrackDownloadFilename } from '@/lib/storage/audio-delivery.js';
import { embedMp3MetadataAndCover } from '@/lib/mp3-id3.js';
import { checkStreamPlayDedupe, getClientIp } from '@/lib/security.js';
import {
  MAX_EXPLICIT_RANGE_BYTES,
  parseValidByteRangeHeader,
  parseContentRangeHeader,
  planDriveUpstreamRange,
  resolveBufferSliceRange,
} from '@/lib/stream-range.js';

export const dynamic = 'force-dynamic';

const MAX_FULL_CACHE_ENTRIES = 4;
const MAX_CACHED_FILE_BYTES = 25 * 1024 * 1024;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const MAX_CHUNK_CACHE_TOTAL_BYTES = 32 * 1024 * 1024; // 32 MB total across hot 256KB-512KB stream chunks

function getFullAudioCache() {
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

function getFileSizeCache() {
  if (!globalThis.__masudAudioSizeCache) {
    globalThis.__masudAudioSizeCache = new Map();
  }
  return globalThis.__masudAudioSizeCache;
}

function getChunkCacheState() {
  if (!globalThis.__masudAudioChunkCacheState) {
    globalThis.__masudAudioChunkCacheState = {
      map: new Map(),
      totalBytes: 0,
    };
  }
  return globalThis.__masudAudioChunkCacheState;
}

function getCachedFileSize(fileId, fallbackSize = 0) {
  const cache = getFileSizeCache();
  const entry = cache.get(fileId);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS && entry.size > 0) {
    return entry.size;
  }
  if (entry) cache.delete(fileId);
  const numericFallback = Number(fallbackSize) || 0;
  return numericFallback > 0 ? numericFallback : 0;
}

function setCachedFileSize(fileId, size) {
  const numericSize = Number(size) || 0;
  if (!fileId || numericSize <= 0) return;
  const cache = getFileSizeCache();
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(fileId, { size: numericSize, timestamp: Date.now() });
}

function getCachedAudioBuffer(fileId) {
  const cache = getFullAudioCache();
  const now = Date.now();
  const cached = cache.get(fileId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.buffer?.length > 0) {
    cache.delete(fileId);
    cached.timestamp = now;
    cache.set(fileId, cached);
    return cached.buffer;
  }
  if (cached) cache.delete(fileId);
  return null;
}

function storeAudioCacheBuffer(fileId, buffer) {
  if (!buffer || buffer.length === 0 || buffer.length > MAX_CACHED_FILE_BYTES) return;
  const cache = getFullAudioCache();
  if (cache.size >= MAX_FULL_CACHE_ENTRIES && !cache.has(fileId)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(fileId, {
    buffer,
    timestamp: Date.now(),
  });
}

function getCachedStreamChunk(cacheKey) {
  const state = getChunkCacheState();
  const entry = state.map.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
    state.map.delete(cacheKey);
    state.totalBytes = Math.max(0, state.totalBytes - entry.buffer.length);
    return null;
  }
  // Touch LRU position
  state.map.delete(cacheKey);
  entry.timestamp = Date.now();
  state.map.set(cacheKey, entry);
  return entry;
}

function storeCachedStreamChunk(cacheKey, entry) {
  if (!entry?.buffer || entry.buffer.length === 0 || entry.buffer.length > MAX_EXPLICIT_RANGE_BYTES) {
    return;
  }
  const state = getChunkCacheState();
  const existing = state.map.get(cacheKey);
  if (existing) {
    state.map.delete(cacheKey);
    state.totalBytes = Math.max(0, state.totalBytes - existing.buffer.length);
  }
  while (state.totalBytes + entry.buffer.length > MAX_CHUNK_CACHE_TOTAL_BYTES && state.map.size > 0) {
    const oldestKey = state.map.keys().next().value;
    const oldestVal = oldestKey ? state.map.get(oldestKey) : null;
    if (oldestKey) state.map.delete(oldestKey);
    if (oldestVal) state.totalBytes = Math.max(0, state.totalBytes - oldestVal.buffer.length);
  }
  state.map.set(cacheKey, {
    ...entry,
    timestamp: Date.now(),
  });
  state.totalBytes += entry.buffer.length;
}

async function fetchDriveWithAuth(url, { rangeHeader = null, signal = null } = {}) {
  let token = await getGoogleDriveAccessToken();
  const buildHeaders = (bearer) => {
    const reqHeaders = {
      Authorization: `Bearer ${bearer}`,
      'Accept-Encoding': 'identity',
    };
    if (rangeHeader) {
      reqHeaders.Range = rangeHeader;
    }
    return reqHeaders;
  };

  let res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(token),
    signal,
    cache: 'no-store',
  });

  if (res.status === 401) {
    token = await getGoogleDriveAccessToken({ forceRefresh: true });
    res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(token),
      signal,
      cache: 'no-store',
    });
  }

  return res;
}

async function fetchDriveFileSize(fileId, signal = null) {
  const metaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?fields=size&supportsAllDrives=true`;
  const res = await fetchDriveWithAuth(metaUrl, { signal });
  if (!res.ok) return 0;
  try {
    const json = await res.json();
    const size = Number(json?.size || 0);
    if (size > 0) {
      setCachedFileSize(fileId, size);
      return size;
    }
  } catch {
    // Ignore parse error
  }
  return 0;
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
      const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId
      )}?alt=media&supportsAllDrives=true`;
      const res = await fetchDriveWithAuth(mediaUrl);
      if (!res.ok) {
        throw new Error(`Google Drive download failed with status ${res.status}`);
      }
      const fullBuffer = Buffer.from(await res.arrayBuffer());
      setCachedFileSize(fileId, fullBuffer.length);
      storeAudioCacheBuffer(fileId, fullBuffer);
      return fullBuffer;
    } finally {
      inFlight.delete(fileId);
    }
  })();

  inFlight.set(fileId, promise);
  return promise;
}

function buildBaseStreamHeaders(mimeType) {
  const headers = new Headers();
  headers.set('Content-Type', mimeType || 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=3600, no-transform');
  headers.set('X-Accel-Buffering', 'no');
  headers.set('X-Content-Type-Options', 'nosniff');
  return headers;
}

function createPullThroughWebStream({
  upstreamBody,
  cacheKey = '',
  contentRange = '',
  status = 200,
  expectedChunkLength = 0,
}) {
  const reader = upstreamBody.getReader();
  let teeChunks = cacheKey && expectedChunkLength > 0 && expectedChunkLength <= MAX_EXPLICIT_RANGE_BYTES
    ? []
    : null;
  let teeBytes = 0;

  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          if (teeChunks !== null && teeBytes > 0 && teeBytes === expectedChunkLength) {
            storeCachedStreamChunk(cacheKey, {
              buffer: Buffer.concat(teeChunks, teeBytes),
              contentRange,
              status,
            });
          }
          teeChunks = null;
          controller.close();
          return;
        }

        if (value && value.byteLength > 0) {
          controller.enqueue(value);
          if (teeChunks !== null) {
            teeBytes += value.byteLength;
            if (teeBytes <= MAX_EXPLICIT_RANGE_BYTES) {
              teeChunks.push(Buffer.from(value));
            } else {
              teeChunks = null;
            }
          }
        }
      } catch (err) {
        teeChunks = null;
        controller.error(err);
      }
    },
    async cancel(reason) {
      teeChunks = null;
      try {
        await reader.cancel(reason);
      } catch {
        // Ignore upstream cancel errors
      }
    },
  });
}

function serveBufferWithRange(fullBuffer, parsedRange, headers) {
  const slice = resolveBufferSliceRange(parsedRange, fullBuffer.length);
  if (slice.status === 416) {
    headers.set('Content-Range', slice.contentRange);
    return new NextResponse(null, { status: 416, headers });
  }

  const chunk = fullBuffer.subarray(slice.start, slice.end + 1);
  if (slice.contentRange) {
    headers.set('Content-Range', slice.contentRange);
  }
  headers.set('Content-Length', String(chunk.length));
  return new NextResponse(chunk, { status: slice.status, headers });
}

async function findAuthorizedTrack(id) {
  const db = await getDbState();
  let track = (db.music || []).find((m) => (m.id === id || m.slug === id) && m.isPublished);

  if (!track) {
    const { authorized } = await requireAdminSession();
    if (authorized) {
      track = (db.music || []).find((m) => m.id === id || m.slug === id);
    }
  }
  return { db, track };
}

export async function HEAD(request, { params }) {
  const { id } = await params;
  const { track } = await findAuthorizedTrack(id);
  if (!track || !track.audioFileId) {
    return new NextResponse(null, { status: 404 });
  }

  const headers = buildBaseStreamHeaders(track.audioMimeType);
  let knownSize = getCachedFileSize(track.audioFileId, track.audioFileSize);
  if (knownSize <= 0) {
    try {
      knownSize = await fetchDriveFileSize(track.audioFileId, request.signal);
    } catch {
      knownSize = 0;
    }
  }
  if (knownSize > 0) {
    headers.set('Content-Length', String(knownSize));
  }
  return new NextResponse(null, { status: 200, headers });
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get('download') === '1';

  const { db, track } = await findAuthorizedTrack(id);

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
  const parsedRange = parseValidByteRangeHeader(rawRangeHeader);

  const ip = getClientIp(request);
  const isInitialStreamRequest =
    !parsedRange || (parsedRange.type !== 'suffix' && parsedRange.start === 0);
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
    const headers = buildBaseStreamHeaders(track.audioMimeType);

    // Downloads require the complete buffer to embed full ID3v2.3 metadata and cover art
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

    // Fast path 1: full buffer already cached in RAM -> serve bounded progressive slice immediately
    const cachedBuffer = getCachedAudioBuffer(track.audioFileId);
    if (cachedBuffer) {
      return serveBufferWithRange(cachedBuffer, parsedRange, headers);
    }

    // Plan bounded upstream byte range so open-ended `Range: bytes=0-` fetches ONLY the opening chunk (~256 KB)
    // and never blocks waiting for the entire MP3 file to download before starting playback
    let knownTotalBytes = getCachedFileSize(track.audioFileId, track.audioFileSize);
    let plan = planDriveUpstreamRange(parsedRange, knownTotalBytes);

    if (plan.needsTotalLengthForSuffix) {
      knownTotalBytes = await fetchDriveFileSize(track.audioFileId, request.signal);
      plan = planDriveUpstreamRange(parsedRange, knownTotalBytes);
    }

    if (plan.unsatisfiable) {
      if (plan.totalLength > 0) {
        headers.set('Content-Range', `bytes */${plan.totalLength}`);
      }
      return new NextResponse(null, { status: 416, headers });
    }

    // Fast path 2: individual hot chunk already in LRU RAM cache -> instant zero-Drive-latency playback
    const chunkCacheKey = plan.upstreamRangeHeader
      ? `${track.audioFileId}:${plan.upstreamRangeHeader}`
      : '';
    if (chunkCacheKey) {
      const cachedChunk = getCachedStreamChunk(chunkCacheKey);
      if (cachedChunk) {
        if (cachedChunk.contentRange) {
          headers.set('Content-Range', cachedChunk.contentRange);
        }
        headers.set('Content-Length', String(cachedChunk.buffer.length));
        return new NextResponse(cachedChunk.buffer, { status: cachedChunk.status, headers });
      }
    }

    // Direct Google Drive v3 HTTP media fetch with bounded Range + cached OAuth access token
    const driveMediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      track.audioFileId
    )}?alt=media&supportsAllDrives=true`;

    let upstreamRes = await fetchDriveWithAuth(driveMediaUrl, {
      rangeHeader: plan.upstreamRangeHeader,
      signal: request.signal,
    });

    // If DB fileSize was stale and triggered 416 upstream, refresh true size from Drive and retry once
    if (upstreamRes.status === 416) {
      const realTotal = await fetchDriveFileSize(track.audioFileId, request.signal);
      if (realTotal > 0) {
        const retryPlan = planDriveUpstreamRange(parsedRange, realTotal);
        if (retryPlan.unsatisfiable) {
          headers.set('Content-Range', `bytes */${realTotal}`);
          return new NextResponse(null, { status: 416, headers });
        }
        plan = retryPlan;
        upstreamRes = await fetchDriveWithAuth(driveMediaUrl, {
          rangeHeader: plan.upstreamRangeHeader,
          signal: request.signal,
        });
      }
    }

    if (upstreamRes.status === 416) {
      const cr416 = upstreamRes.headers.get('content-range');
      if (cr416) headers.set('Content-Range', cr416);
      return new NextResponse(null, { status: 416, headers });
    }

    if (!upstreamRes.ok || !upstreamRes.body) {
      const errText = await upstreamRes.text().catch(() => '');
      console.error(
        `Google Drive audio stream failed (${upstreamRes.status}) for file ${track.audioFileId}:`,
        errText.slice(0, 300)
      );
      return NextResponse.json(
        {
          ok: false,
          error: 'Unable to stream audio from Google Drive. Verify file permissions and quota.',
        },
        { status: upstreamRes.status === 404 ? 404 : 502 }
      );
    }

    const upstreamContentRange = upstreamRes.headers.get('content-range') || '';
    const upstreamContentLength = upstreamRes.headers.get('content-length') || '';
    const upstreamContentType = upstreamRes.headers.get('content-type') || '';

    if (upstreamContentType.startsWith('audio/')) {
      headers.set('Content-Type', track.audioMimeType || upstreamContentType);
    }

    const parsedCr = parseContentRangeHeader(upstreamContentRange);
    if (parsedCr?.total && parsedCr.total > 0) {
      setCachedFileSize(track.audioFileId, parsedCr.total);
    }

    const isPartial = upstreamRes.status === 206 && Boolean(upstreamContentRange);
    if (isPartial) {
      headers.set('Content-Range', upstreamContentRange);
    }

    const parsedLen = Number.parseInt(upstreamContentLength, 10) || 0;
    if (parsedLen > 0) {
      headers.set('Content-Length', String(parsedLen));
    }

    const effectiveCacheKey = plan.upstreamRangeHeader
      ? `${track.audioFileId}:${plan.upstreamRangeHeader}`
      : '';

    const webStream = createPullThroughWebStream({
      upstreamBody: upstreamRes.body,
      cacheKey: isPartial ? effectiveCacheKey : '',
      contentRange: upstreamContentRange,
      status: isPartial ? 206 : 200,
      expectedChunkLength: parsedLen,
    });

    return new NextResponse(webStream, {
      status: isPartial ? 206 : 200,
      headers,
    });
  } catch (err) {
    if (request.signal?.aborted || err?.name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    console.error('Audio streaming route error:', err?.message || err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Unable to stream audio from Google Drive. Verify file permissions and quota.',
      },
      { status: 502 }
    );
  }
}

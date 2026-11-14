import { getAuthenticatedDriveClient } from '@/lib/google-drive.js';
import { getEnvConfig } from '@/lib/env.js';

const COVER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_COVER_CACHE_ENTRIES = 20;

function getCoverCache() {
  if (!globalThis.__masudCoverArtCache) {
    globalThis.__masudCoverArtCache = new Map();
  }
  return globalThis.__masudCoverArtCache;
}

function detectImageMimeType(buffer) {
  if (!buffer || buffer.length < 4) return 'image/jpeg';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  return 'image/jpeg';
}

function extractDriveFileIdFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const mediaMatch = trimmed.match(/\/api\/media\/([a-zA-Z0-9_-]{10,120})/);
  if (mediaMatch && mediaMatch[1]) return mediaMatch[1];
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,120})/);
  if (queryMatch && queryMatch[1]) return queryMatch[1];
  return '';
}

async function fetchImageBufferByDriveId(fileId) {
  const cleanId = String(fileId || '').trim();
  if (!cleanId || !/^[a-zA-Z0-9_-]{10,120}$/.test(cleanId)) return null;

  const cache = getCoverCache();
  const cacheKey = `drive:${cleanId}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < COVER_CACHE_TTL_MS && cached.buffer?.length > 0) {
    return cached;
  }

  try {
    const { drive } = await getAuthenticatedDriveClient();
    const mediaRes = await drive.files.get(
      { fileId: cleanId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(mediaRes.data);
    if (buffer.length > 0) {
      const entry = {
        buffer,
        mimeType: detectImageMimeType(buffer),
        timestamp: Date.now(),
      };
      if (cache.size >= MAX_COVER_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(cacheKey, entry);
      return entry;
    }
  } catch {
    // Fallback to public Drive URL
    try {
      const publicUrl = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(cleanId)}`;
      const res = await fetch(publicUrl);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 0) {
          const entry = {
            buffer,
            mimeType: detectImageMimeType(buffer),
            timestamp: Date.now(),
          };
          cache.set(cacheKey, entry);
          return entry;
        }
      }
    } catch {
      // Ignore fallback error
    }
  }
  return null;
}

async function fetchImageBufferByExternalUrl(url) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return null;
  }
  const cleanUrl = url.trim();
  const cache = getCoverCache();
  const cacheKey = `url:${cleanUrl}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < COVER_CACHE_TTL_MS && cached.buffer?.length > 0) {
    return cached;
  }

  try {
    const res = await fetch(cleanUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    const entry = {
      buffer,
      mimeType: detectImageMimeType(buffer),
      timestamp: Date.now(),
    };
    if (cache.size >= MAX_COVER_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(cacheKey, entry);
    return entry;
  } catch {
    return null;
  }
}

/**
 * Resolves the cover artwork buffer for a track or release.
 * Priority:
 * 1. Track's own thumbnail (Drive File ID or URL)
 * 2. Release / Album's cover image (Drive File ID or URL)
 * 3. Artist profile image (Drive File ID or URL)
 */
export async function resolveCoverArtForTrack({ track, album, artist }) {
  const candidateDriveIds = [
    track?.thumbnailFileId,
    extractDriveFileIdFromUrl(track?.thumbnail),
    album?.coverImageFileId,
    extractDriveFileIdFromUrl(album?.coverImage),
    artist?.profileImageFileId,
    extractDriveFileIdFromUrl(artist?.profileImage),
  ].filter(Boolean);

  for (const driveId of candidateDriveIds) {
    const found = await fetchImageBufferByDriveId(driveId);
    if (found && found.buffer?.length > 0) {
      return found;
    }
  }

  const candidateUrls = [
    track?.thumbnail,
    album?.coverImage,
    artist?.profileImage,
  ].filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()));

  for (const extUrl of candidateUrls) {
    const found = await fetchImageBufferByExternalUrl(extUrl);
    if (found && found.buffer?.length > 0) {
      return found;
    }
  }

  return null;
}

function stripExistingId3v2Tags(mp3Buffer) {
  let offset = 0;
  while (
    mp3Buffer.length - offset >= 10 &&
    mp3Buffer[offset] === 0x49 && // 'I'
    mp3Buffer[offset + 1] === 0x44 && // 'D'
    mp3Buffer[offset + 2] === 0x33 // '3'
  ) {
    const flags = mp3Buffer[offset + 5];
    const tagSize =
      ((mp3Buffer[offset + 6] & 0x7f) << 21) |
      ((mp3Buffer[offset + 7] & 0x7f) << 14) |
      ((mp3Buffer[offset + 8] & 0x7f) << 7) |
      (mp3Buffer[offset + 9] & 0x7f);
    const footerSize = (flags & 0x10) !== 0 ? 10 : 0;
    const totalTagBytes = 10 + tagSize + footerSize;
    if (totalTagBytes <= 10 || offset + totalTagBytes >= mp3Buffer.length) {
      break;
    }
    offset += totalTagBytes;
  }
  return offset > 0 ? mp3Buffer.subarray(offset) : mp3Buffer;
}

function buildFrameHeader(frameId, payloadLength) {
  const header = Buffer.alloc(10);
  header.write(frameId, 0, 4, 'ascii');
  header.writeUInt32BE(payloadLength, 4);
  header[8] = 0x00;
  header[9] = 0x00;
  return header;
}

function createTextFrame(frameId, value) {
  const str = String(value ?? '').trim();
  if (!str) return null;

  const isPureAscii = /^[\x20-\x7E]*$/.test(str);
  let payload;
  if (isPureAscii) {
    payload = Buffer.concat([Buffer.from([0x00]), Buffer.from(str, 'latin1')]);
  } else {
    // UTF-16 with BOM (0x01 + 0xFF 0xFE + UTF-16LE bytes)
    payload = Buffer.concat([
      Buffer.from([0x01, 0xff, 0xfe]),
      Buffer.from(str, 'utf16le'),
    ]);
  }

  return Buffer.concat([buildFrameHeader(frameId, payload.length), payload]);
}

function createCommentFrame(commentText) {
  const str = String(commentText ?? '').trim();
  if (!str) return null;

  const lang = Buffer.from('eng', 'ascii');
  const isPureAscii = /^[\x20-\x7E]*$/.test(str);
  let payload;
  if (isPureAscii) {
    payload = Buffer.concat([
      Buffer.from([0x00]),
      lang,
      Buffer.from([0x00]), // empty short content description
      Buffer.from(str, 'latin1'),
    ]);
  } else {
    payload = Buffer.concat([
      Buffer.from([0x01]),
      lang,
      Buffer.from([0xff, 0xfe, 0x00, 0x00]), // empty UTF-16 description + null terminator
      Buffer.from([0xff, 0xfe]),
      Buffer.from(str, 'utf16le'),
    ]);
  }

  return Buffer.concat([buildFrameHeader('COMM', payload.length), payload]);
}

function createApicFrame(imageBuffer, mimeType = 'image/jpeg') {
  if (!imageBuffer || imageBuffer.length === 0) return null;

  const safeMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  const payload = Buffer.concat([
    Buffer.from([0x00]), // ISO-8859-1 text encoding
    Buffer.from(safeMime, 'ascii'),
    Buffer.from([0x00]), // null-terminated MIME string
    Buffer.from([0x03]), // 0x03 = Cover (front)
    Buffer.from([0x00]), // empty description (null-terminated)
    imageBuffer,
  ]);

  return Buffer.concat([buildFrameHeader('APIC', payload.length), payload]);
}

function encodeSynchsafeInt28(size) {
  const buf = Buffer.alloc(4);
  buf[0] = (size >>> 21) & 0x7f;
  buf[1] = (size >>> 14) & 0x7f;
  buf[2] = (size >>> 7) & 0x7f;
  buf[3] = size & 0x7f;
  return buf;
}

export function resolveTrackYear(track, album) {
  const explicitTrackYear = String(track?.releaseYear || '').trim();
  if (/^\d{4}$/.test(explicitTrackYear)) return explicitTrackYear;

  const explicitAlbumYear = String(album?.releaseYear || '').trim();
  if (/^\d{4}$/.test(explicitAlbumYear)) return explicitAlbumYear;

  if (album?.releaseDate) {
    const match = String(album.releaseDate).match(/\b(19\d{2}|20\d{2})\b/);
    if (match) return match[1];
  }

  if (track?.createdAt) {
    const y = new Date(track.createdAt).getFullYear();
    if (Number.isFinite(y) && y > 1900) return String(y);
  }

  return String(new Date().getFullYear());
}

/**
 * Embeds ID3v2.3 metadata (Title, Artist, Album, Year, Genre, Track Number, Composer, Comment)
 * and Front Cover Artwork (APIC) directly into an MP3 buffer.
 */
export async function embedMp3MetadataAndCover(
  mp3Buffer,
  { track, album, artist, totalAlbumTracks = 0 } = {}
) {
  if (!mp3Buffer || mp3Buffer.length === 0) return mp3Buffer;

  try {
    const env = getEnvConfig();
    const appUrl = (env.appUrl || 'https://masudhauqe.com').replace(/\/+$/, '');

    const title = track?.title || 'Untitled Track';
    const artistName =
      track?.artistName || artist?.name || 'Masud Hauqe';
    const albumArtist = artist?.name || artistName;
    const albumTitle =
      album?.title || track?.albumTitle || 'Single';
    const year = resolveTrackYear(track, album);
    const genre =
      track?.genre || album?.genre || 'Contemporary';
    const composer =
      track?.composer || artistName;

    let trackNumberStr = '';
    if (track?.trackOrder && Number(track.trackOrder) > 0) {
      trackNumberStr =
        totalAlbumTracks > 0
          ? `${track.trackOrder}/${totalAlbumTracks}`
          : String(track.trackOrder);
    }

    const coverArt = await resolveCoverArtForTrack({ track, album, artist });

    const frames = [
      createTextFrame('TIT2', title),
      createTextFrame('TPE1', artistName),
      createTextFrame('TPE2', albumArtist),
      createTextFrame('TALB', albumTitle),
      createTextFrame('TYER', year),
      createTextFrame('TCON', genre),
      trackNumberStr ? createTextFrame('TRCK', trackNumberStr) : null,
      createTextFrame('TCOM', composer),
      createTextFrame('TPUB', `${artist?.name || 'Masud Hauqe'} Official Archive`),
      createCommentFrame(`Downloaded from ${appUrl}`),
      coverArt?.buffer
        ? createApicFrame(coverArt.buffer, coverArt.mimeType)
        : null,
    ].filter(Boolean);

    if (frames.length === 0) return mp3Buffer;

    const framesBuffer = Buffer.concat(frames);
    const id3Header = Buffer.concat([
      Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]), // ID3v2.3.0, flags = 0
      encodeSynchsafeInt28(framesBuffer.length),
    ]);

    const cleanAudioData = stripExistingId3v2Tags(mp3Buffer);
    return Buffer.concat([id3Header, framesBuffer, cleanAudioData]);
  } catch (err) {
    console.error('Non-fatal ID3v2 embedding warning:', err);
    return mp3Buffer;
  }
}

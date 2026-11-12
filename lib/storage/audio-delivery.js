/**
 * Dedicated Audio Storage & Delivery Service Abstraction
 * Supports Google Drive API v3 public file delivery and future Object Storage / CDN providers.
 */

export function getPublicStreamUrl(musicRecord) {
  if (!musicRecord || !musicRecord.id || !musicRecord.audioFileId) {
    return null;
  }
  return `/api/music/${encodeURIComponent(musicRecord.id)}/stream`;
}

export function getPublicDownloadUrl(musicRecord) {
  if (!musicRecord || !musicRecord.id || !musicRecord.audioFileId || !musicRecord.downloadEnabled) {
    return null;
  }
  return `/api/music/${encodeURIComponent(musicRecord.id)}/stream?download=1`;
}

export function getTrackDownloadFilename(musicRecord) {
  if (!musicRecord) return 'track.mp3';
  // Prefer the track's title (or original audioFileName stripped of any legacy timestamp prefix)
  const rawTitle = String(musicRecord.title || '').trim();
  const fallbackFile = String(musicRecord.audioFileName || '')
    .replace(/^[a-z0-9]{7,10}-/i, '')
    .trim();
  const chosen = rawTitle || fallbackFile || musicRecord.slug || 'track';
  const cleaned = chosen
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\.mp3$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned || 'track'}.mp3`;
}

export function getGoogleDriveDirectDownloadUrl(fileId) {
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

export function getReleaseZipDownloadUrl(albumRecord) {
  if (!albumRecord || !albumRecord.id) return null;
  const tracks = Array.isArray(albumRecord.tracks) ? albumRecord.tracks : [];
  const hasDownloadable = tracks.some((t) => t.audioFileId && t.downloadEnabled !== false);
  if (!hasDownloadable) return null;
  return `/api/albums/${encodeURIComponent(albumRecord.id)}/download-zip`;
}

export function getReleaseZipFilename(albumRecord) {
  const rawTitle = String(albumRecord?.title || albumRecord?.slug || 'Release')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\.zip$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${rawTitle || 'Release'}.zip`;
}

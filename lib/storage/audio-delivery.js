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

export function getGoogleDriveDirectDownloadUrl(fileId) {
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

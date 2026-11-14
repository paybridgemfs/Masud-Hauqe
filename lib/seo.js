import { headers } from 'next/headers';
import { getPublicWebsiteData } from './db.js';

export async function resolveOrigin() {
  const configuredAppUrl = (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.RENDER_EXTERNAL_HOSTNAME
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
      : '')
  )
    .trim()
    .replace(/\/+$/, '');

  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
    if (
      configuredAppUrl &&
      !configuredAppUrl.includes('localhost') &&
      !configuredAppUrl.includes('127.0.0.1')
    ) {
      return configuredAppUrl;
    }
    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  } catch {
    // Fallback when called outside request scope
  }

  return configuredAppUrl || 'http://localhost:3000';
}

export function toAbsoluteUrl(url, origin) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanOrigin = (origin || 'http://localhost:3000').replace(/\/+$/, '');
  return `${cleanOrigin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export function resolveTrackSocialBanner(track, origin) {
  if (!track) return '';
  const rawThumb =
    track.thumbnail ||
    (track.thumbnailFileId ? `/api/media/${track.thumbnailFileId}` : '') ||
    track.album?.coverImage ||
    (track.album?.coverImageFileId ? `/api/media/${track.album.coverImageFileId}` : '') ||
    (track.youtubeVideoId
      ? `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`
      : '');
  return toAbsoluteUrl(rawThumb, origin);
}

export function resolveReleaseSocialBanner(album, origin) {
  if (!album) return '';
  const firstTrackThumb =
    Array.isArray(album.tracks) && album.tracks.length > 0
      ? album.tracks[0]?.thumbnail ||
        (album.tracks[0]?.thumbnailFileId
          ? `/api/media/${album.tracks[0].thumbnailFileId}`
          : '')
      : '';
  const rawCover =
    album.coverImage ||
    (album.coverImageFileId ? `/api/media/${album.coverImageFileId}` : '') ||
    firstTrackThumb;
  return toAbsoluteUrl(rawCover, origin);
}

/**
 * Generates dynamic SEO & Social Preview metadata for general website routes
 * (/, /about, /music, /releases, /contact, /videos, /gallery, /legal/[slug])
 * strictly WITHOUT a social preview banner image (banner is reserved for Track & Release pages only).
 */
export async function buildPageSocialMetadata({
  pageId,
  path = '',
  customTitle = '',
  customDescription = '',
}) {
  const [{ artist, settings, seoSettings }, origin] = await Promise.all([
    getPublicWebsiteData(),
    resolveOrigin(),
  ]);

  const seoRecord = (seoSettings || []).find((s) => s.page === pageId);
  const globalSeo = (seoSettings || []).find((s) => s.page === 'global');
  const artistName = artist?.name || settings?.siteName || 'Masud Hauqe';
  const siteName = settings?.siteName || artistName;

  const title =
    customTitle ||
    seoRecord?.metaTitle ||
    globalSeo?.metaTitle ||
    `${siteName} — Official Artist Website`;

  const description =
    customDescription ||
    seoRecord?.metaDescription ||
    artist?.shortBiography ||
    settings?.siteTagline ||
    globalSeo?.metaDescription ||
    `Official website and master audio archive of ${artistName}.`;

  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const canonicalUrl = `${origin}${cleanPath}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      type: 'website',
      images: [],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [],
    },
  };
}

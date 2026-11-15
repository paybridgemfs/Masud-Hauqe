import type { MetadataRoute } from 'next';
import { getPublicWebsiteData } from '@/lib/db.js';
import { resolveOrigin } from '@/lib/seo.js';

export const revalidate = 60;

function toValidDate(value: unknown): Date {
  if (!value) return new Date();
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [origin, publicData] = await Promise.all([
    resolveOrigin(),
    getPublicWebsiteData(),
  ]);

  const baseUrl = (origin || 'http://localhost:3000').replace(/\/+$/, '');
  const publishedMusic: Array<Record<string, any>> = Array.isArray(publicData?.publishedMusic)
    ? publicData.publishedMusic
    : [];
  const publishedAlbums: Array<Record<string, any>> = Array.isArray(publicData?.publishedAlbums)
    ? publicData.publishedAlbums
    : [];
  const pages: Array<Record<string, any>> = Array.isArray(publicData?.pages)
    ? publicData.pages
    : [];

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/music`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/releases`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/videos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Collect all published tracks (both standalone singles and release tracks)
  const trackUrlMap = new Map<string, MetadataRoute.Sitemap[number]>();

  for (const track of publishedMusic) {
    const slugOrId = track?.slug || track?.id;
    if (!slugOrId) continue;
    const url = `${baseUrl}/music/${encodeURIComponent(String(slugOrId))}`;
    trackUrlMap.set(url, {
      url,
      lastModified: toValidDate(track.updatedAt || track.createdAt),
      changeFrequency: 'weekly',
      priority: track.albumId ? 0.75 : 0.8,
    });
  }

  // Also ensure any tracks nested inside published releases are included
  const releaseRoutes: MetadataRoute.Sitemap = [];
  for (const album of publishedAlbums) {
    const slugOrId = album?.slug || album?.id;
    if (!slugOrId) continue;
    releaseRoutes.push({
      url: `${baseUrl}/releases/${encodeURIComponent(String(slugOrId))}`,
      lastModified: toValidDate(album.updatedAt || album.createdAt),
      changeFrequency: 'weekly',
      priority: 0.85,
    });

    if (Array.isArray(album.tracks)) {
      for (const track of album.tracks) {
        const trackSlugOrId = track?.slug || track?.id;
        if (!trackSlugOrId) continue;
        const trackUrl = `${baseUrl}/music/${encodeURIComponent(String(trackSlugOrId))}`;
        if (!trackUrlMap.has(trackUrl)) {
          trackUrlMap.set(trackUrl, {
            url: trackUrl,
            lastModified: toValidDate(track.updatedAt || track.createdAt || album.updatedAt),
            changeFrequency: 'weekly',
            priority: 0.75,
          });
        }
      }
    }
  }

  const legalRoutes: MetadataRoute.Sitemap = pages
    .filter((p) => Boolean(p?.slug))
    .map((p) => ({
      url: `${baseUrl}/legal/${encodeURIComponent(String(p.slug))}`,
      lastModified: toValidDate(p.updatedAt || p.createdAt),
      changeFrequency: 'yearly',
      priority: 0.4,
    }));

  return [
    ...staticRoutes,
    ...releaseRoutes,
    ...Array.from(trackUrlMap.values()),
    ...legalRoutes,
  ];
}

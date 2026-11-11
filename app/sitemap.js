import { getPublicWebsiteData } from '@/lib/db.js';
import { getEnvConfig } from '@/lib/env.js';

export default async function sitemap() {
  const { appUrl } = getEnvConfig();
  const baseUrl = appUrl.replace(/\/$/, '');
  const { publishedMusic, publishedAlbums, pages } = await getPublicWebsiteData();

  const staticRoutes = ['', '/about', '/music', '/releases', '/videos', '/gallery', '/contact'].map(
    (route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: route === '' ? 1.0 : 0.8,
    })
  );

  const musicRoutes = publishedMusic.map((track) => ({
    url: `${baseUrl}/music/${track.slug}`,
    lastModified: new Date(track.updatedAt || track.createdAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const albumRoutes = publishedAlbums.map((album) => ({
    url: `${baseUrl}/releases/${album.slug}`,
    lastModified: new Date(album.updatedAt || album.createdAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const legalRoutes = pages.map((p) => ({
    url: `${baseUrl}/legal/${p.slug}`,
    lastModified: new Date(p.updatedAt || p.createdAt),
    changeFrequency: 'yearly',
    priority: 0.4,
  }));

  return [...staticRoutes, ...musicRoutes, ...albumRoutes, ...legalRoutes];
}

import { resolveOrigin } from '@/lib/seo.js';

export default async function robots() {
  const origin = await resolveOrigin();
  const baseUrl = (origin || 'http://localhost:3000').replace(/\/+$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

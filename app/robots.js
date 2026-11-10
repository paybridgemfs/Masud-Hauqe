import { getEnvConfig } from '@/lib/env.js';

export default function robots() {
  const { appUrl } = getEnvConfig();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${appUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}

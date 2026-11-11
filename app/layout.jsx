import { Dosis } from 'next/font/google';
import './globals.css';
import { PlayerProvider } from '@/components/player/PlayerContext.jsx';
import GlobalMusicPlayer from '@/components/player/GlobalMusicPlayer.jsx';
import { getPublicWebsiteData } from '@/lib/db.js';

const dosis = Dosis({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dosis',
});

export async function generateMetadata() {
  const { seoSettings, settings } = await getPublicWebsiteData();
  const globalSeo = (seoSettings || []).find((s) => s.page === 'global') || {};
  const title =
    globalSeo.metaTitle ||
    settings.siteName ||
    'Official Artist Platform';
  const description =
    globalSeo.metaDescription ||
    settings.siteTagline ||
    '';

  const faviconFileId = (settings.faviconFileId || '').trim();
  const faviconHref = faviconFileId
    ? `/api/media/${faviconFileId}?v=${encodeURIComponent(faviconFileId.slice(-8))}`
    : settings.faviconUrl
    ? settings.faviconUrl
    : '/favicon.ico';

  const baseUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  let metadataBase;
  try {
    metadataBase = new URL(baseUrl);
  } catch {
    metadataBase = new URL('http://localhost:3000');
  }

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: [{ url: faviconHref }],
      shortcut: [{ url: faviconHref }],
      apple: [{ url: faviconHref }],
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function RootLayout({ children }) {
  const { settings } = await getPublicWebsiteData();
  const primaryColor = settings.primaryColor || '#C8A464';
  const bgColor = settings.backgroundColor || '#09090B';
  const textColor = settings.textColor || '#F4F1EA';

  return (
    <html
      lang={settings.defaultLanguage || 'en'}
      className={`${dosis.variable} dark`}
      style={{
        '--mh-primary': primaryColor,
        '--mh-bg': bgColor,
        '--mh-text': textColor,
      }}
    >
      <body
        suppressHydrationWarning
        className={`${dosis.className} min-h-screen bg-[#09090B] text-[#F4F1EA] antialiased selection:bg-[#C8A464] selection:text-[#09090B]`}
      >
        <PlayerProvider>
          {children}
          <GlobalMusicPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}

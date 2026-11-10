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
    'Masud Hauqe — Official Artist Platform & CMS';
  const description =
    globalSeo.metaDescription ||
    'Official music artist portfolio, streaming library, MP3 delivery platform, and dynamic content management system for Masud Hauqe.';

  return {
    title,
    description,
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

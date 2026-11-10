import React from 'react';
import Header from '@/components/website/Header.jsx';
import Footer from '@/components/website/Footer.jsx';
import { getPublicWebsiteData } from '@/lib/db.js';

export const dynamic = 'force-dynamic';

export default async function WebsiteLayout({ children }) {
  const { artist, settings, headerNav, footerNav, socialLinks } = await getPublicWebsiteData();

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-[#F4F1EA]">
      <Header settings={settings} navItems={headerNav} />
      <main className="flex-1">{children}</main>
      <Footer
        artist={artist}
        settings={settings}
        footerNav={footerNav}
        socialLinks={socialLinks}
      />
    </div>
  );
}

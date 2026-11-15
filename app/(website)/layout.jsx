import React from "react";
import Header from "@/components/website/Header.jsx";
import Footer from "@/components/website/Footer.jsx";
import WebsiteLoader from "@/components/website/WebsiteLoader.jsx";
import GlobalCursorSpotlight from "@/components/ui/GlobalCursorSpotlight.jsx";
import { getPublicWebsiteData } from "@/lib/db.js";

export const revalidate = 60;

export default async function WebsiteLayout({ children }) {
  const { artist, settings, headerNav, footerNav, socialLinks, pages } = await getPublicWebsiteData();

  const themeStyle = {
    '--mh-primary': settings?.primaryColor || '#C8A464',
    '--mh-secondary': settings?.secondaryColor || '#111115',
    '--mh-accent': settings?.accentColor || '#D4B475',
    '--mh-bg': settings?.backgroundColor || '#09090B',
    '--mh-text': settings?.textColor || '#F4F1EA',
    '--mh-border': settings?.borderColor || '#222226',
    '--mh-container': settings?.containerWidth || '1280px',
    '--mh-spacing': settings?.sectionSpacing || '64px',
    '--mh-radius': settings?.borderRadius || '8px',
    backgroundColor: settings?.backgroundColor || '#09090B',
    color: settings?.textColor || '#F4F1EA',
  };

  return (
    <div
      style={themeStyle}
      className="relative min-h-screen flex flex-col bg-[#09090B] text-[#F4F1EA]"
    >
      <GlobalCursorSpotlight />
      <WebsiteLoader siteName={settings?.siteName || artist?.name || "Masud Hauqe"} />
      <Header settings={settings} navItems={headerNav} />
      <main className="flex-1">{children}</main>
      <Footer
        artist={artist}
        settings={settings}
        footerNav={footerNav}
        socialLinks={socialLinks}
        pages={pages}
      />
    </div>
  );
}

import React from "react";
import Header from "@/components/website/Header.jsx";
import Footer from "@/components/website/Footer.jsx";
import WebsiteLoader from "@/components/website/WebsiteLoader.jsx";
import GlobalCursorSpotlight from "@/components/ui/GlobalCursorSpotlight.jsx";
import { getPublicWebsiteData } from "@/lib/db.js";

export const revalidate = 60;

export default async function WebsiteLayout({ children }) {
  const { artist, settings, headerNav, footerNav, socialLinks } = await getPublicWebsiteData();

  return (
    <div className="relative min-h-screen flex flex-col bg-[#09090B] text-[#F4F1EA]">
      <GlobalCursorSpotlight />
      <WebsiteLoader siteName={settings?.siteName || artist?.name || "Masud Hauqe"} />
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

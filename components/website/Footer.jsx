import React from 'react';
import Link from 'next/link';
import SocialMediaLinks from '@/components/website/SocialMediaLinks.jsx';
import { sanitizeSafeUrl } from '@/lib/safe-url.js';

const CORE_ARCHIVE_PATHS = new Set(['/music', '/releases', '/about', '/contact']);
const LEGAL_SLUG_HINTS = ['privacy-policy', 'terms-and-conditions', 'copyright-music-usage'];

export default function Footer({
  artist,
  settings = {},
  footerNav = [],
  socialLinks = [],
  pages = [],
}) {
  const siteName = settings.siteName || artist?.name || '';
  const footerDesc = settings.footerDescription || '';
  const copyrightText =
    settings.footerCopyright ||
    settings.copyrightText ||
    (siteName ? `© ${new Date().getFullYear()} ${siteName}. All Rights Reserved.` : '');
  const contactEmail = settings.contactEmail || '';
  const contactLocation = settings.contactLocation || '';

  // Deduplicate footer navigation against built-in archive links and sanitize URLs
  const seenUrls = new Set(CORE_ARCHIVE_PATHS);
  const customFooterLinks = [];
  for (const item of footerNav || []) {
    const safeUrl = sanitizeSafeUrl(item?.url || '', { allowRelative: true, fallback: '' });
    if (!safeUrl || seenUrls.has(safeUrl)) continue;
    seenUrls.add(safeUrl);
    customFooterLinks.push({ ...item, safeUrl });
  }

  // Render legal links dynamically from published CMS pages
  const publishedLegalPages = (pages || []).filter(
    (p) =>
      p &&
      p.isPublished !== false &&
      p.slug &&
      (LEGAL_SLUG_HINTS.includes(p.slug) ||
        p.slug.includes('privacy') ||
        p.slug.includes('terms') ||
        p.slug.includes('copyright'))
  );

  return (
    <footer className="bg-[#070709] border-t border-[#222226] text-[#A1A1AA] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#1A1A1E]">
          {/* Artist Monograph Identity */}
          <div className="md:col-span-5 space-y-3">
            <Link
              href="/"
              className="text-xl font-bold tracking-[0.14em] text-[#F4F1EA] hover:text-[#C8A464] transition-colors inline-block"
            >
              {siteName.toUpperCase()}
            </Link>
            <p className="text-sm text-[#9A9AA2] leading-relaxed max-w-md">{footerDesc}</p>
            {(contactEmail || contactLocation) && (
              <div className="pt-2 text-xs text-[#8E8E96] flex flex-wrap items-center gap-2">
                {contactLocation && <span>{contactLocation}</span>}
                {contactLocation && contactEmail && <span aria-hidden="true">·</span>}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-[#C8A464] hover:underline"
                  >
                    {contactEmail}
                  </a>
                )}
              </div>
            )}
            {socialLinks.length > 0 && (
              <div className="pt-3">
                <SocialMediaLinks socialLinks={socialLinks} variant="footer-icons" />
              </div>
            )}
          </div>

          {/* Archive Navigation */}
          <div className="md:col-span-4 space-y-3">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-[#F4F1EA]">
              ARCHIVE & LEGAL
            </h2>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li>
                <Link href="/music" className="hover:text-[#F4F1EA] transition-colors">
                  Music Library
                </Link>
              </li>
              <li>
                <Link href="/releases" className="hover:text-[#F4F1EA] transition-colors">
                  Releases
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#F4F1EA] transition-colors">
                  Biography
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#F4F1EA] transition-colors">
                  Contact
                </Link>
              </li>
              {customFooterLinks.map((item) => (
                <li key={item.id || item.safeUrl}>
                  <Link href={item.safeUrl} className="hover:text-[#F4F1EA] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Profiles & Admin Access */}
          <div className="md:col-span-3 space-y-3">
            <h2 className="text-xs font-semibold tracking-[0.16em] text-[#F4F1EA]">
              CONNECT & PLATFORM
            </h2>
            {socialLinks.length > 0 ? (
              <SocialMediaLinks socialLinks={socialLinks} variant="footer-list" />
            ) : (
              <p className="text-xs text-[#71717A] leading-relaxed">
                Official social channels are managed via the Artist CMS.
              </p>
            )}
            <div className="pt-2">
              <Link
                href="/admin/dashboard"
                className="text-xs text-[#8E8E96] hover:text-[#C8A464] transition-colors underline underline-offset-4"
              >
                Artist CMS Console
              </Link>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
          <p>{copyrightText}</p>
          {publishedLegalPages.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {publishedLegalPages.map((page, index) => (
                <React.Fragment key={page.id || page.slug}>
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <Link
                    href={`/legal/${page.slug}`}
                    className="hover:text-[#D4D4D8] transition-colors"
                  >
                    {page.title}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

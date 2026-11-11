import React from 'react';
import Link from 'next/link';
import SocialMediaLinks from '@/components/website/SocialMediaLinks.jsx';

export default function Footer({ artist, settings = {}, footerNav = [], socialLinks = [] }) {
  const siteName = settings.siteName || artist?.name || 'Masud Hauqe';
  const footerDesc =
    settings.footerDescription ||
    'Official digital repertoire, studio master streaming, and authorized archive of Masud Hauqe.';
  const copyrightText =
    settings.copyrightText || `© ${new Date().getFullYear()} ${siteName}. All Rights Reserved.`;
  const contactEmail = settings.contactEmail || '';
  const contactLocation = settings.contactLocation || '';

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
              {footerNav.map((item) => (
                <li key={item.id}>
                  <Link href={item.url} className="hover:text-[#F4F1EA] transition-colors">
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
          <div className="flex items-center gap-3">
            <Link href="/legal/privacy-policy" className="hover:text-[#D4D4D8] transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/legal/terms-and-conditions" className="hover:text-[#D4D4D8] transition-colors">
              Terms
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/legal/copyright-music-usage" className="hover:text-[#D4D4D8] transition-colors">
              Copyright
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

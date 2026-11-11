'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';

export default function Header({ settings = {}, navItems = [] }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoText = settings.logoText || settings.siteName || 'MASUD HAUQE';
  const logoUrl = settings.logoUrl || '';
  const sticky = settings.stickyHeader !== 'false';
  const ctaLabel = settings.headerCtaLabel || 'Explore Music';
  const ctaUrl = settings.headerCtaUrl || '/music';

  // Enforce max 5 concise top-level navigation links per Top Bar Contract
  const visibleLinks = (navItems || []).slice(0, 5);

  return (
    <header
      className={`${
        sticky ? 'sticky top-0 z-30' : 'relative z-20'
      } bg-[#09090B]/90 backdrop-blur-md border-b border-[#222226]`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo or Single text element wordmark */}
        <Link
          href="/"
          className="text-lg sm:text-xl font-bold tracking-[0.14em] text-[#F4F1EA] hover:text-[#C8A464] transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5"
        >
          {logoUrl ? (
            <span className="relative h-8 w-28 block">
              <Image
                src={logoUrl}
                alt={logoText}
                fill
                sizes="112px"
                referrerPolicy="no-referrer"
                className="object-contain object-left"
              />
            </span>
          ) : (
            logoText
          )}
        </Link>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {visibleLinks.map((item) => {
            const active =
              pathname === item.url || (item.url !== '/' && pathname?.startsWith(item.url));
            return (
              <Link
                key={item.id}
                href={item.url}
                className={`relative whitespace-nowrap shrink-0 py-1.5 transition-colors ${
                  active ? 'text-[#C8A464]' : 'text-[#B4B4BC] hover:text-[#F4F1EA]'
                }`}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="header-nav-underline"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-[#C8A464] rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action (+ mobile hamburger button) */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={ctaUrl}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold tracking-wider text-[#09090B] bg-[#C8A464] hover:bg-[#D4B475] rounded transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0"
          >
            {ctaLabel}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2.5 text-[#F4F1EA] hover:text-[#C8A464] rounded transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer with Smooth AnimatePresence */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-[#0E0E12] border-b border-[#222226] overflow-hidden"
          >
            <div className="px-4 pt-3 pb-6 space-y-2">
              <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
                {(navItems || []).map((item) => {
                  const active = pathname === item.url;
                  return (
                    <Link
                      key={item.id}
                      href={item.url}
                      onClick={() => setMobileOpen(false)}
                      className={`px-3 py-2.5 rounded text-base font-medium transition-colors ${
                        active
                          ? 'text-[#C8A464] bg-[#18181D]'
                          : 'text-[#E4E4E7] hover:bg-[#141418] hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/videos"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded text-base font-medium text-[#E4E4E7] hover:bg-[#141418]"
                >
                  Videos
                </Link>
                <Link
                  href="/gallery"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded text-base font-medium text-[#E4E4E7] hover:bg-[#141418]"
                >
                  Gallery
                </Link>
              </nav>
              <div className="pt-3 border-t border-[#222226]">
                <Link
                  href={ctaUrl}
                  onClick={() => setMobileOpen(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-[#09090B] bg-[#C8A464] rounded"
                >
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

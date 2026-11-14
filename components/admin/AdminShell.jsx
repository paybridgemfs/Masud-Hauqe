'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  UserCheck,
  Music,
  PlusCircle,
  Disc,
  Image as ImageIcon,
  Layers,
  Compass,
  FileText,
  Palette,
  HardDrive,
  Globe,
  Mail,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Live Analytics & Heatmap', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    group: 'Artist Management',
    items: [{ label: 'Profile, Bio & Socials', href: '/admin/artist', icon: UserCheck }],
  },
  {
    group: 'Music Management',
    items: [
      { label: 'All Music', href: '/admin/music', icon: Music },
      { label: 'Add Music', href: '/admin/music/add', icon: PlusCircle },
      { label: 'Releases', href: '/admin/releases', icon: Disc },
    ],
  },
  {
    group: 'Media Management',
    items: [{ label: 'Gallery', href: '/admin/gallery', icon: ImageIcon }],
  },
  {
    group: 'Website CMS',
    items: [
      { label: 'Sections & Homepage', href: '/admin/sections', icon: Layers },
      { label: 'Header, Nav & Footer', href: '/admin/navigation', icon: Compass },
      { label: 'Pages & Legal', href: '/admin/pages', icon: FileText },
    ],
  },
  {
    group: 'Appearance & SEO',
    items: [
      { label: 'Theme & Branding', href: '/admin/appearance', icon: Palette },
      { label: 'SEO Manager', href: '/admin/seo', icon: Globe },
    ],
  },
  {
    group: 'Integrations & System',
    items: [
      { label: 'Google Drive & YouTube', href: '/admin/integrations/google-drive', icon: HardDrive },
      { label: 'Contact Messages', href: '/admin/messages', icon: Mail },
      { label: 'Profile & Admin Security', href: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminShell({ admin, title, subtitle, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0C0C10] border-r border-[#222228]">
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#222228]">
        <Link
          href="/admin/dashboard"
          className="text-base font-bold tracking-[0.14em] text-[#F4F1EA] hover:text-[#C8A464] transition-colors whitespace-nowrap"
        >
          MASUD HAUQE CMS
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close sidebar drawer"
          className="lg:hidden p-1.5 text-[#9A9AA2] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((section) => (
          <div key={section.group} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold tracking-[0.15em] text-[#71717A] uppercase">
              {section.group}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#1D1B16] text-[#C8A464] border border-[#C8A464]/30'
                      : 'text-[#B4B4BC] hover:bg-[#15151B] hover:text-[#F4F1EA]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[#222228] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="min-w-0">
            <p className="font-semibold text-[#F4F1EA] truncate">{admin?.name || 'Administrator'}</p>
            <p className="text-[#8E8E96] truncate">@{admin?.username || 'admin'}</p>
          </div>
          <span className="text-[11px] text-[#C8A464] font-medium">{admin?.role || 'ADMIN'}</span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full px-3 py-2 rounded border border-[#2C2C35] hover:border-[#F87171] text-xs font-semibold text-[#D4D4D8] hover:text-[#FCA5A5] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F1EA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24">
        {/* Top Bar Contract for Admin Workspace */}
        <header className="h-16 bg-[#0C0C10] border-b border-[#222228] px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open admin navigation drawer"
              className="lg:hidden p-2 text-[#D4D4D8] hover:text-white rounded"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F4F1EA] truncate">
                Admin Console / <span className="text-[#C8A464]">{title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/music/add"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Music</span>
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded border border-[#2C2C35] text-xs font-semibold text-[#D4D4D8] hover:text-[#F4F1EA] hover:border-[#C8A464] transition-colors whitespace-nowrap"
            >
              <span>Public Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Mandatory Initial Password Change Warning Banner */}
        {admin?.mustChangePassword && (
          <div className="bg-[#2B1F0E] border-b border-[#854D0E] px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#FDE68A]">
              <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0" />
              <span>
                Security Notice: You are using the initial bootstrapped admin password. Please change your password now.
              </span>
            </div>
            <Link
              href="/admin/settings"
              className="px-3 py-1 rounded bg-[#FBBF24] text-[#09090B] text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              Change Initial Password
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          <div className="border-b border-[#222228] pb-5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F4F1EA]">{title}</h1>
            {subtitle && <p className="text-sm text-[#9A9AA2] mt-1">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

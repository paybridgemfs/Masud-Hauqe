import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import {
  Music,
  Disc,
  PlayCircle,
  Download,
  HardDrive,
  Mail,
  Layers,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const artist = db.artists?.[0] || { name: 'Masud Hauqe' };
  const allMusic = db.music || [];
  const publishedMusic = allMusic.filter((m) => m.isPublished);
  const allAlbums = db.albums || [];
  const totalPlays = allMusic.reduce((sum, m) => sum + (m.playCount || 0), 0);
  const totalDownloads = allMusic.reduce((sum, m) => sum + (m.downloadCount || 0), 0);
  const unreadMessages = (db.contactMessages || []).filter((m) => !m.isRead).length;
  const gdrive = db.googleIntegrations?.[0] || {};
  const visibleSections = (db.sections || []).filter((s) => s.isVisible).length;
  const recentAuditLogs = (db.auditLogs || []).slice(0, 6);

  return (
    <AdminShell
      admin={admin}
      title="Platform Overview"
      subtitle={`Real-time PostgreSQL & CMS telemetry for ${artist.name}`}
    >
      {/* Top KPI Grid (Tabular Numerals) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>PUBLISHED TRACKS</span>
            <Music className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-2xl font-bold text-[#F4F1EA] tabular-nums">
            {publishedMusic.length}{' '}
            <span className="text-xs font-normal text-[#8E8E96]">/ {allMusic.length} total</span>
          </p>
          <Link href="/admin/music" className="text-xs text-[#C8A464] hover:underline inline-block">
            Manage Repertoire →
          </Link>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>OFFICIAL RELEASES</span>
            <Disc className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-2xl font-bold text-[#F4F1EA] tabular-nums">{allAlbums.length}</p>
          <Link href="/admin/releases" className="text-xs text-[#C8A464] hover:underline inline-block">
            Open Release Manager →
          </Link>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>STREAM & MP3 DELIVERY</span>
            <PlayCircle className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-2xl font-bold text-[#F4F1EA] tabular-nums">
            {totalPlays} <span className="text-xs font-normal text-[#8E8E96]">plays</span> ·{' '}
            {totalDownloads} <span className="text-xs font-normal text-[#8E8E96]">downloads</span>
          </p>
          <span className="text-xs text-[#8E8E96] block">Live database counters</span>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>INQUIRY INBOX</span>
            <Mail className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-2xl font-bold text-[#F4F1EA] tabular-nums">
            {unreadMessages}{' '}
            <span className="text-xs font-normal text-[#8E8E96]">
              unread / {(db.contactMessages || []).length} total
            </span>
          </p>
          <Link href="/admin/messages" className="text-xs text-[#C8A464] hover:underline inline-block">
            Review Messages →
          </Link>
        </div>
      </section>

      {/* Quick Actions & Integration Status */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#F4F1EA]">Primary CMS Workflows</h2>
            <span className="text-xs text-[#8E8E96] tabular-nums">
              {visibleSections} Active Homepage Sections
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/music/add"
              className="p-4 rounded bg-[#181713] border border-[#C8A464]/40 hover:border-[#C8A464] flex items-start justify-between gap-3 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#C8A464]">Add New Music</p>
                <p className="text-xs text-[#9A9AA2] mt-1">
                  Fetch YouTube metadata & upload authorized MP3 to Google Drive
                </p>
              </div>
              <PlusCircle className="w-4 h-4 text-[#C8A464] shrink-0 mt-0.5" />
            </Link>

            <Link
              href="/admin/artist"
              className="p-4 rounded bg-[#15151A] border border-[#26262F] hover:border-[#C8A464]/50 flex items-start justify-between gap-3 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#F4F1EA]">Edit Artist Biography</p>
                <p className="text-xs text-[#9A9AA2] mt-1">
                  Update Masud Hauqe profile, career notes, and achievements
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9A9AA2] shrink-0 mt-0.5" />
            </Link>

            <Link
              href="/admin/sections"
              className="p-4 rounded bg-[#15151A] border border-[#26262F] hover:border-[#C8A464]/50 flex items-start justify-between gap-3 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#F4F1EA]">Homepage Section Manager</p>
                <p className="text-xs text-[#9A9AA2] mt-1">
                  Reorder, hide, show, or customize homepage blocks
                </p>
              </div>
              <Layers className="w-4 h-4 text-[#9A9AA2] shrink-0 mt-0.5" />
            </Link>

            <Link
              href="/admin/appearance"
              className="p-4 rounded bg-[#15151A] border border-[#26262F] hover:border-[#C8A464]/50 flex items-start justify-between gap-3 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[#F4F1EA]">Appearance & Design Tokens</p>
                <p className="text-xs text-[#9A9AA2] mt-1">
                  Configure palette colors, header CTA, and branding
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9A9AA2] shrink-0 mt-0.5" />
            </Link>
          </div>
        </div>

        {/* Google Drive Storage Status Card */}
        <div className="lg:col-span-5 bg-[#111115] border border-[#222228] rounded-lg p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F4F1EA]">Google Drive Storage</h2>
              <HardDrive className="w-4 h-4 text-[#C8A464]" />
            </div>
            <p className="text-xs text-[#8E8E96] leading-relaxed">
              Google Drive API v3 is used exclusively for storing authorized MP3 master files.
            </p>
            <div className="pt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1E1E24]">
                <span className="text-[#8E8E96]">Connection Status</span>
                <span
                  className={
                    gdrive.connected ? 'text-[#4ADE80] font-semibold' : 'text-[#FBBF24] font-semibold'
                  }
                >
                  {gdrive.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1E1E24]">
                <span className="text-[#8E8E96]">Connected Account</span>
                <span className="text-[#F4F1EA]">{gdrive.accountEmail || 'None'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#8E8E96]">Target Upload Folder</span>
                <span className="text-[#D4D4D8] truncate max-w-[180px]">
                  {gdrive.uploadFolderName || 'Root Archive'}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/integrations/google-drive"
            className="w-full py-2.5 px-4 rounded border border-[#2E2E38] hover:border-[#C8A464] text-xs font-semibold text-center text-[#F4F1EA] hover:text-[#C8A464] transition-colors"
          >
            Configure Google Drive & YouTube Integrations
          </Link>
        </div>
      </section>

      {/* Recent Audit Trail */}
      <section className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#222228] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#F4F1EA]">Recent Security & CMS Audit Logs</h2>
          <Link href="/admin/settings" className="text-xs text-[#C8A464] hover:underline">
            View All Logs →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1E1E24] text-[#8E8E96]">
                <th className="py-3 px-6 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Entity</th>
                <th className="py-3 px-4 font-semibold">Record ID</th>
                <th className="py-3 px-6 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A20]">
              {recentAuditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#15151A]">
                  <td className="py-3 px-6 font-medium text-[#F4F1EA]">{log.action}</td>
                  <td className="py-3 px-4 text-[#9A9AA2]">{log.entityType}</td>
                  <td className="py-3 px-4 text-[#8E8E96] font-mono">{log.entityId || '—'}</td>
                  <td className="py-3 px-6 text-right text-[#8E8E96] tabular-nums">
                    {new Date(log.createdAt).toLocaleString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

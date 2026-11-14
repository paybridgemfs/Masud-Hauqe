import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminMusicClient from '@/components/admin/AdminMusicClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminMusicPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const singleMusicOnly = (db.music || []).filter((m) => !m.albumId);

  return (
    <AdminShell
      admin={admin}
      title="All Music"
      subtitle="Manage single track recordings, ID3v2 metadata, cover photos, and MP3 download permissions (10 tracks per page)"
    >
      <AdminMusicClient initialMusic={singleMusicOnly} />
    </AdminShell>
  );
}

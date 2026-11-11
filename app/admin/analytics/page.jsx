import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminAnalyticsClient from '@/components/admin/AdminAnalyticsClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const artist = db.artists?.[0] || { name: 'Masud Hauqe' };

  return (
    <AdminShell
      admin={admin}
      title="Live Analytics & Listener Heatmap"
      subtitle={`Real-time stream telemetry, listener activity matrix, and global distribution for ${artist.name}`}
    >
      <AdminAnalyticsClient
        musicList={db.music || []}
        albumsList={db.albums || []}
        artistName={artist.name}
      />
    </AdminShell>
  );
}

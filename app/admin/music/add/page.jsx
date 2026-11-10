import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import { getEnvConfig } from '@/lib/env.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AddMusicClient from '@/components/admin/AddMusicClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminAddMusicPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const env = getEnvConfig();
  const artist = db.artists?.[0] || { name: 'Masud Hauqe' };
  const gdrive = db.googleIntegrations?.[0] || {};

  return (
    <AdminShell
      admin={admin}
      title="Add Music"
      subtitle="Fetch YouTube video metadata automatically and upload authorized MP3 masters to Google Drive"
    >
      <AddMusicClient
        defaultArtistName={artist.name}
        initialAlbums={db.albums || []}
        googleConnected={Boolean(gdrive.connected)}
        youtubeConfigured={env.youtube.isConfigured}
      />
    </AdminShell>
  );
}

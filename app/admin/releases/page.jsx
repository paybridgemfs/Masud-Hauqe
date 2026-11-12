import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, sortAlbumTracks } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminAlbumsClient from '@/components/admin/AdminAlbumsClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminAlbumsPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const artistName = db.artists?.[0]?.name || 'Masud Hauqe';
  const googleConnected = Boolean(db.googleIntegrations?.[0]?.connected);
  const enrichedAlbums = (db.albums || []).map((album) => {
    const tracks = sortAlbumTracks(
      (db.music || []).filter((m) => m.albumId === album.id)
    );
    return {
      ...album,
      tracks,
      trackCount: tracks.length,
    };
  });

  return (
    <AdminShell
      admin={admin}
      title="Release Management"
      subtitle="Create official releases and batch-upload MP3 tracks directly under each release"
    >
      <AdminAlbumsClient
        initialAlbums={enrichedAlbums}
        defaultArtistName={artistName}
        googleConnected={googleConnected}
      />
    </AdminShell>
  );
}

import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminArtistClient from '@/components/admin/AdminArtistClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminArtistPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const artist = db.artists?.[0] || { name: 'Masud Hauqe', slug: 'masud-hauqe' };

  return (
    <AdminShell
      admin={admin}
      title="Artist Management"
      subtitle="Update the biography, career monograph, achievements, and social profiles for Masud Hauqe"
    >
      <AdminArtistClient initialArtist={artist} initialSocialLinks={db.socialLinks || []} />
    </AdminShell>
  );
}

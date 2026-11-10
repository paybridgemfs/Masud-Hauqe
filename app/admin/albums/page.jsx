import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminAlbumsClient from '@/components/admin/AdminAlbumsClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminAlbumsPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();

  return (
    <AdminShell
      admin={admin}
      title="Album Management"
      subtitle="Create and organize studio albums and multi-track collections for Masud Hauqe"
    >
      <AdminAlbumsClient initialAlbums={db.albums || []} />
    </AdminShell>
  );
}

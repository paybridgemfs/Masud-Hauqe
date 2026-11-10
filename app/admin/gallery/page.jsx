import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import { AdminGalleryManager } from '@/components/admin/AdminGalleryManager.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminGalleryPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();

  return (
    <AdminShell
      admin={admin}
      title="Gallery Media Management"
      subtitle="Publish and curate official artist photography for Masud Hauqe"
    >
      <AdminGalleryManager initialGallery={db.gallery || []} />
    </AdminShell>
  );
}

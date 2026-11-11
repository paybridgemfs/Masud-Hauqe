import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import { getEnvConfig } from '@/lib/env.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminSeoClient from '@/components/admin/AdminSeoClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminSeoPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const { appUrl } = getEnvConfig();

  return (
    <AdminShell
      admin={admin}
      title="SEO & OpenGraph Manager"
      subtitle="Manage route-specific meta titles, descriptions, canonical URLs, and OpenGraph cards."
    >
      <AdminSeoClient initialSeoSettings={db.seoSettings || []} appUrl={appUrl} />
    </AdminShell>
  );
}

import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getPublicWebsiteData, getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminNavigationClient from '@/components/admin/AdminNavigationClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminNavigationPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const { settings } = await getPublicWebsiteData();
  const db = await getDbState();

  return (
    <AdminShell
      admin={admin}
      title="Header, Navigation & Footer Manager"
      subtitle="Customize navigation links, sticky header configuration, and footer correspondence details"
    >
      <AdminNavigationClient
        initialSettings={settings}
        initialNavItems={db.navigationItems || []}
      />
    </AdminShell>
  );
}

import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminSettingsClient from '@/components/admin/AdminSettingsClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage({ searchParams }) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const resolvedParams = await searchParams;
  const promptPasswordChange = resolvedParams?.promptPasswordChange === '1';
  const db = await getDbState();

  return (
    <AdminShell
      admin={admin}
      title="Security & Admin Settings"
      subtitle="Manage administrator credentials and password rotation."
    >
      <AdminSettingsClient
        admin={admin}
        promptPasswordChange={promptPasswordChange}
      />
    </AdminShell>
  );
}

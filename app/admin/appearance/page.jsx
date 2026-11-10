import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminAppearanceClient from '@/components/admin/AdminAppearanceClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminAppearancePage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();
  const settingsMap = {};
  for (const s of db.websiteSettings || []) {
    settingsMap[s.key] = s.value;
  }

  return (
    <AdminShell
      admin={admin}
      title="Appearance & Branding"
      subtitle="Configure website identity, Noir & Gold color tokens, and layout spacing."
    >
      <AdminAppearanceClient initialSettings={settingsMap} />
    </AdminShell>
  );
}

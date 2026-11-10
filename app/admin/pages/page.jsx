import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import { AdminPagesManager } from '@/components/admin/AdminPagesManager.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminPagesRoute() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();

  return (
    <AdminShell
      admin={admin}
      title="Pages & Legal Documents"
      subtitle="Manage Privacy Policy, Terms and Conditions, and Copyright & Music Usage Information"
    >
      <AdminPagesManager initialPages={db.pages || []} />
    </AdminShell>
  );
}

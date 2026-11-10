import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminSectionsClient from '@/components/admin/AdminSectionsClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminSectionsPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();

  return (
    <AdminShell
      admin={admin}
      title="Sections & Homepage Manager"
      subtitle="Add, edit, reorder, hide, or show dynamic homepage sections without modifying source code"
    >
      <AdminSectionsClient initialSections={db.sections || []} />
    </AdminShell>
  );
}

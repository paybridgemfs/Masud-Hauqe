import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import AdminMessagesClient from '@/components/admin/AdminMessagesClient.jsx';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const db = await getDbState();

  return (
    <AdminShell
      admin={admin}
      title="Contact & Booking Messages"
      subtitle="Review direct visitor inquiries, press requests, and booking messages."
    >
      <AdminMessagesClient initialMessages={db.contactMessages || []} />
    </AdminShell>
  );
}

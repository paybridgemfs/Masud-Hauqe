import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth.js';

export default async function AdminIndexPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect('/admin/login');
  }
  redirect('/admin/dashboard');
}

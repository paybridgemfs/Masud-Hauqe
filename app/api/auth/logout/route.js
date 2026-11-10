import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, getCurrentAdmin } from '@/lib/auth.js';
import { logAuditEvent } from '@/lib/db.js';

export async function POST() {
  try {
    const admin = await getCurrentAdmin();
    await clearAdminSessionCookie();
    if (admin) {
      await logAuditEvent({
        adminId: admin.id,
        action: 'ADMIN_LOGOUT',
        entityType: 'Admin',
        entityId: admin.id,
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to sign out.' }, { status: 500 });
  }
}

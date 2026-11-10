import { NextResponse } from 'next/server';
import { requireAdminSession, changeAdminPassword } from '@/lib/auth.js';
import { passwordChangeSchema } from '@/lib/validation.js';
import { updateDbState, logAuditEvent } from '@/lib/db.js';

export async function POST(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized || !admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Support profile update if action === 'profile'
    if (body.action === 'profile') {
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();
      if (!name) {
        return NextResponse.json({ ok: false, error: 'Admin name is required.' }, { status: 400 });
      }
      await updateDbState((state) => {
        const target = state.admins.find((a) => a.id === admin.id);
        if (target) {
          target.name = name.slice(0, 120);
          target.email = email.slice(0, 160);
          target.updatedAt = new Date().toISOString();
        }
      });
      await logAuditEvent({
        adminId: admin.id,
        action: 'ADMIN_PROFILE_UPDATED',
        entityType: 'Admin',
        entityId: admin.id,
        metadata: { name, email },
      });
      return NextResponse.json({ ok: true, message: 'Admin profile updated successfully.' });
    }

    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Invalid password input.' },
        { status: 400 }
      );
    }

    const result = await changeAdminPassword(
      admin.id,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      admin: result.admin,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    console.error('Password change error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update password.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, logAuditEvent, cuid } from '@/lib/db.js';
import { contactMessageSchema } from '@/lib/validation.js';
import { checkRateLimit } from '@/lib/security.js';

export async function GET() {
  const { authorized } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const db = await getDbState();
  return NextResponse.json({ ok: true, messages: db.contactMessages || [] });
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rate = checkRateLimit(`contact:${ip}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many submissions. Please wait a moment before sending another message.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = contactMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Please check your form inputs.' },
        { status: 400 }
      );
    }

    const newMessage = {
      id: cuid(),
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await updateDbState((state) => {
      state.contactMessages.unshift(newMessage);
    });

    return NextResponse.json({
      ok: true,
      message: 'Your inquiry has been delivered to Masud Hauqe Management.',
      record: newMessage,
    });
  } catch (err) {
    console.error('Contact submission error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to submit contact message.' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  const { id, isRead } = body;
  await updateDbState((state) => {
    const msg = state.contactMessages.find((m) => m.id === id);
    if (msg) {
      msg.isRead = Boolean(isRead);
    }
  });
  await logAuditEvent({
    adminId: admin.id,
    action: 'CONTACT_MESSAGE_STATUS_UPDATED',
    entityType: 'ContactMessage',
    entityId: id,
    metadata: { isRead },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await updateDbState((state) => {
    state.contactMessages = state.contactMessages.filter((m) => m.id !== id);
  });
  await logAuditEvent({
    adminId: admin.id,
    action: 'CONTACT_MESSAGE_DELETED',
    entityType: 'ContactMessage',
    entityId: id || '',
  });
  return NextResponse.json({ ok: true });
}

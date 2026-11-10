import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, logAuditEvent, cuid } from '@/lib/db.js';
import { sectionSchema } from '@/lib/validation.js';

export async function GET() {
  const db = await getDbState();
  const sections = [...(db.sections || [])].sort((a, b) => a.position - b.position);
  return NextResponse.json({ ok: true, sections });
}

export async function POST(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'Invalid section configuration.' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  let created = null;

  await updateDbState((state) => {
    const nextPos =
      state.sections.length > 0
        ? Math.max(...state.sections.map((s) => s.position || 0)) + 1
        : 1;
    created = {
      id: cuid(),
      name: parsed.data.name,
      type: parsed.data.type,
      position: parsed.data.position || nextPos,
      isVisible: Boolean(parsed.data.isVisible),
      content: parsed.data.content || {},
      settings: parsed.data.settings || {},
      createdAt: now,
      updatedAt: now,
    };
    state.sections.push(created);
  });

  await logAuditEvent({
    adminId: admin.id,
    action: 'SECTION_CREATED',
    entityType: 'Section',
    entityId: created.id,
    metadata: { name: created.name, type: created.type },
  });

  revalidatePath('/');
  return NextResponse.json({ ok: true, section: created });
}

export async function PUT(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Support bulk reorder
  if (Array.isArray(body.orderedIds)) {
    await updateDbState((state) => {
      body.orderedIds.forEach((id, index) => {
        const sec = state.sections.find((s) => s.id === id);
        if (sec) {
          sec.position = index + 1;
          sec.updatedAt = new Date().toISOString();
        }
      });
    });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  }

  const { id, name, type, position, isVisible, content, settings } = body;
  let updated = null;

  await updateDbState((state) => {
    const target = state.sections.find((s) => s.id === id);
    if (!target) return;
    if (typeof name === 'string' && name.trim()) target.name = name.trim();
    if (typeof type === 'string') target.type = type;
    if (typeof position === 'number') target.position = position;
    if (typeof isVisible === 'boolean') target.isVisible = isVisible;
    if (content && typeof content === 'object') target.content = { ...target.content, ...content };
    if (settings && typeof settings === 'object') target.settings = { ...target.settings, ...settings };
    target.updatedAt = new Date().toISOString();
    updated = { ...target };
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Section not found.' }, { status: 404 });
  }

  await logAuditEvent({
    adminId: admin.id,
    action: 'SECTION_UPDATED',
    entityType: 'Section',
    entityId: id,
    metadata: { name: updated.name, isVisible: updated.isVisible },
  });

  revalidatePath('/');
  return NextResponse.json({ ok: true, section: updated });
}

export async function DELETE(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  await updateDbState((state) => {
    state.sections = state.sections.filter((s) => s.id !== id);
  });

  await logAuditEvent({
    adminId: admin.id,
    action: 'SECTION_DELETED',
    entityType: 'Section',
    entityId: id || '',
  });

  revalidatePath('/');
  return NextResponse.json({ ok: true });
}

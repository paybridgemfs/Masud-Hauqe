import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, appendAuditRecord, cuid } from '@/lib/db.js';
import { sectionSchema } from '@/lib/validation.js';
import { deleteFileFromGoogleDrive } from '@/lib/google-drive.js';

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
    appendAuditRecord(state, {
      adminId: admin.id,
      action: 'SECTION_CREATED',
      entityType: 'Section',
      entityId: created.id,
      metadata: { name: created.name, type: created.type },
    });
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

  // Support bulk restore of standard repertoire sections
  if (body.action === 'restoreDefaults') {
    const now = new Date().toISOString();
    const defaultSections = [
      {
        id: 'sec-hero',
        name: 'Editorial Hero Section',
        type: 'HERO',
        position: 1,
        isVisible: true,
        content: {
          kicker: 'OFFICIAL ARTIST ARCHIVE',
          headline: 'Masud Hauqe',
          subheadline:
            'Original studio recordings, sonic monographs, and authorized high-resolution MP3 releases.',
          primaryCtaText: 'Listen to Archive',
          primaryCtaUrl: '/music',
          secondaryCtaText: 'Artist Monograph',
          secondaryCtaUrl: '/about',
          showLatestPlayButton: true,
          latestPlayButtonText: 'Play Latest Release',
        },
        settings: { layout: 'split-editorial', theme: 'obsidian-gold' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-featured-music',
        name: 'Featured & Latest Releases',
        type: 'FEATURED_MUSIC',
        position: 2,
        isVisible: true,
        content: {
          kicker: 'SELECTED REPERTOIRE',
          heading: 'Published Master Recordings',
          subheading:
            'Stream directly in the persistent studio player or download authorized MP3 masters when enabled.',
          ctaText: 'Open Full Music Library',
          ctaUrl: '/music',
          showCtaButton: true,
          limit: 8,
          emptyHeading: 'No Tracks Published Yet',
          emptyText:
            'Published audio recordings from the library will appear here automatically.',
        },
        settings: { columns: 4 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-albums',
        name: 'Official Releases & Anthologies',
        type: 'ALBUMS',
        position: 3,
        isVisible: true,
        content: {
          kicker: 'DISCOGRAPHY',
          heading: 'Official Releases & Collections',
          subheading: 'Curated multi-track releases and conceptual bodies of work.',
          ctaText: 'View All Releases',
          ctaUrl: '/releases',
          showCtaButton: true,
          limit: 12,
          emptyHeading: 'No Official Releases Yet',
          emptyText:
            'Curated albums, EPs, and discography collections will appear here once published.',
        },
        settings: { columns: 6 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-bio-preview',
        name: 'Artist Biography Preview',
        type: 'BIOGRAPHY_PREVIEW',
        position: 4,
        isVisible: true,
        content: {
          kicker: 'ARTIST PORTRAIT',
          heading: 'The Sonic Architecture of Masud Hauqe',
          subheading: 'Career notes, musical philosophy, and acoustic monographs.',
          ctaText: 'Read Full Biography',
          ctaUrl: '/about',
          showCtaButton: true,
        },
        settings: { style: 'monograph' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-videos',
        name: 'Official YouTube Sessions',
        type: 'MUSIC_VIDEOS',
        position: 5,
        isVisible: true,
        content: {
          kicker: 'VISUAL ARCHIVE',
          heading: 'Official Video Performances',
          subheading:
            'Embedded directly from official YouTube releases associated with published works.',
          ctaText: 'Open Video Gallery',
          ctaUrl: '/videos',
          showCtaButton: true,
          limit: 6,
          emptyHeading: 'No Music Videos Linked Yet',
          emptyText:
            'YouTube video performances linked to published music tracks will appear here.',
        },
        settings: { limit: 6 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-contact',
        name: 'Direct Management & Booking Inquiry',
        type: 'CONTACT_SECTION',
        position: 6,
        isVisible: true,
        content: {
          kicker: 'CORRESPONDENCE',
          heading: 'Management, Licensing & Press Inquiries',
          subheading:
            'Connect directly with the management desk of Masud Hauqe for performance bookings, sync licensing, or press requests.',
          ctaText: 'Open Inquiry Desk',
          ctaUrl: '/contact',
          showCtaButton: true,
          showEmailButton: true,
        },
        settings: {},
        createdAt: now,
        updatedAt: now,
      },
    ];

    await updateDbState((state) => {
      state.sections = defaultSections;
    });
    revalidatePath('/');
    return NextResponse.json({ ok: true, sections: defaultSections });
  }

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
  let oldBgFileIdToDelete = null;

  await updateDbState((state) => {
    const target = state.sections.find((s) => s.id === id);
    if (!target) return;
    if (typeof name === 'string' && name.trim()) target.name = name.trim();
    if (typeof type === 'string') target.type = type;
    if (typeof position === 'number') target.position = position;
    if (typeof isVisible === 'boolean') target.isVisible = isVisible;
    if (content && typeof content === 'object') {
      const oldBgId = target.content?.backgroundImageFileId || '';
      const nextBgId =
        typeof content.backgroundImageFileId === 'string'
          ? content.backgroundImageFileId
          : oldBgId;
      if (oldBgId && oldBgId !== nextBgId) {
        oldBgFileIdToDelete = oldBgId;
      }
      target.content = { ...target.content, ...content };
    }
    if (settings && typeof settings === 'object') target.settings = { ...target.settings, ...settings };
    target.updatedAt = new Date().toISOString();
    updated = { ...target };
    appendAuditRecord(state, {
      adminId: admin.id,
      action: 'SECTION_UPDATED',
      entityType: 'Section',
      entityId: id,
      metadata: { name: updated.name, isVisible: updated.isVisible },
    });
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Section not found.' }, { status: 404 });
  }

  if (oldBgFileIdToDelete) {
    await deleteFileFromGoogleDrive(oldBgFileIdToDelete);
  }

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
  let removedSection = null;

  await updateDbState((state) => {
    removedSection = state.sections.find((s) => s.id === id) || null;
    state.sections = state.sections.filter((s) => s.id !== id);
    appendAuditRecord(state, {
      adminId: admin.id,
      action: 'SECTION_DELETED',
      entityType: 'Section',
      entityId: id || '',
    });
  });

  if (removedSection?.content?.backgroundImageFileId) {
    await deleteFileFromGoogleDrive(removedSection.content.backgroundImageFileId);
  }

  revalidatePath('/');
  return NextResponse.json({ ok: true });
}

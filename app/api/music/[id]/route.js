import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, logAuditEvent, createUniqueSlug } from '@/lib/db.js';
import { deleteFileFromGoogleDrive } from '@/lib/google-drive.js';

export async function GET(request, { params }) {
  const { id } = await params;
  const db = await getDbState();
  const track = (db.music || []).find((m) => m.id === id || m.slug === id);
  if (!track) {
    return NextResponse.json({ ok: false, error: 'Track not found.' }, { status: 404 });
  }
  const artist = db.artists?.[0] || { id: 'masud-hauqe', name: 'Masud Hauqe' };
  const album = track.albumId ? (db.albums || []).find((a) => a.id === track.albumId) || null : null;
  return NextResponse.json({ ok: true, music: { ...track, artist, album } });
}

export async function PUT(request, { params }) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  let updated = null;

  await updateDbState(async (state) => {
    const target = state.music.find((m) => m.id === id);
    if (!target) return;
    if (typeof body.title === 'string' && body.title.trim()) {
      target.title = body.title.trim();
      target.slug = await createUniqueSlug(state.music, target.title, target.id);
    }
    if (typeof body.description === 'string') target.description = body.description.trim();
    if (typeof body.albumId !== 'undefined') target.albumId = body.albumId || null;
    if (typeof body.thumbnail === 'string') target.thumbnail = body.thumbnail.trim();
    if (typeof body.thumbnailFileId === 'string') target.thumbnailFileId = body.thumbnailFileId.trim();
    if (typeof body.duration === 'string') target.duration = body.duration.trim();
    if (typeof body.isPublished === 'boolean') {
      target.isPublished = body.isPublished;
      target.uploadStatus = body.isPublished ? 'published' : 'uploaded';
    }
    if (typeof body.downloadEnabled === 'boolean') target.downloadEnabled = body.downloadEnabled;
    target.updatedAt = new Date().toISOString();
    updated = { ...target };
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Track not found.' }, { status: 404 });
  }

  await logAuditEvent({
    adminId: admin.id,
    action: 'MUSIC_UPDATED',
    entityType: 'Music',
    entityId: id,
    metadata: { title: updated.title, isPublished: updated.isPublished },
  });

  revalidatePath('/');
  revalidatePath('/music');
  revalidatePath(`/music/${updated.slug}`);
  revalidatePath('/albums');

  return NextResponse.json({ ok: true, music: updated });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  let updatedTrack = null;
  await updateDbState((state) => {
    const target = state.music.find((m) => m.id === id || m.slug === id);
    if (target) {
      target.playCount = (target.playCount || 0) + 1;
      updatedTrack = { ...target };
    }
  });
  if (!updatedTrack) {
    return NextResponse.json({ ok: false, error: 'Track not found.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, playCount: updatedTrack.playCount });
}

export async function DELETE(request, { params }) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  let removedTrack = null;

  await updateDbState((state) => {
    const idx = state.music.findIndex((m) => m.id === id);
    if (idx !== -1) {
      removedTrack = state.music[idx];
      state.music.splice(idx, 1);
    }
  });

  if (!removedTrack) {
    return NextResponse.json({ ok: false, error: 'Track not found.' }, { status: 404 });
  }

  if (removedTrack.audioFileId) {
    await deleteFileFromGoogleDrive(removedTrack.audioFileId);
  }

  await logAuditEvent({
    adminId: admin.id,
    action: 'MUSIC_DELETED',
    entityType: 'Music',
    entityId: id,
    metadata: { title: removedTrack.title },
  });

  revalidatePath('/');
  revalidatePath('/music');
  revalidatePath('/albums');

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, appendAuditRecord, createUniqueSlug } from '@/lib/db.js';
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
  let oldThumbnailFileIdToDelete = null;

  await updateDbState(async (state) => {
    const target = state.music.find((m) => m.id === id);
    if (!target) return;
    if (typeof body.title === 'string' && body.title.trim()) {
      target.title = body.title.trim();
      target.slug = await createUniqueSlug(state.music, target.title, target.id);
    }
    if (typeof body.albumId !== 'undefined') target.albumId = body.albumId || null;
    if (typeof body.thumbnail === 'string') target.thumbnail = body.thumbnail.trim();
    if (typeof body.thumbnailFileId === 'string') {
      const nextThumbId = body.thumbnailFileId.trim();
      if (target.thumbnailFileId && target.thumbnailFileId !== nextThumbId) {
        oldThumbnailFileIdToDelete = target.thumbnailFileId;
      }
      target.thumbnailFileId = nextThumbId;
    }
    if (typeof body.duration === 'string') target.duration = body.duration.trim();
    if (typeof body.isPublished === 'boolean') {
      target.isPublished = body.isPublished;
      target.uploadStatus = body.isPublished ? 'published' : 'uploaded';
    }
    if (typeof body.downloadEnabled === 'boolean') target.downloadEnabled = body.downloadEnabled;
    if (typeof body.includeYoutubeVideo === 'boolean') {
      target.includeYoutubeVideo = body.includeYoutubeVideo;
    }
    target.updatedAt = new Date().toISOString();
    updated = { ...target };
    appendAuditRecord(state, {
      adminId: admin.id,
      action: 'MUSIC_UPDATED',
      entityType: 'Music',
      entityId: id,
      metadata: {
        title: updated.title,
        isPublished: updated.isPublished,
        includeYoutubeVideo: Boolean(updated.includeYoutubeVideo),
      },
    });
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Track not found.' }, { status: 404 });
  }

  if (oldThumbnailFileIdToDelete) {
    await deleteFileFromGoogleDrive(oldThumbnailFileIdToDelete);
  }

  revalidatePath('/');
  revalidatePath('/music');
  revalidatePath(`/music/${updated.slug}`);
  revalidatePath('/releases');
  revalidatePath('/videos');

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
  let isThumbnailShared = false;

  await updateDbState((state) => {
    const idx = state.music.findIndex((m) => m.id === id);
    if (idx !== -1) {
      removedTrack = state.music[idx];
      state.music.splice(idx, 1);
      if (removedTrack.thumbnailFileId) {
        const usedByAlbum = (state.albums || []).some(
          (a) => a.coverImageFileId === removedTrack.thumbnailFileId
        );
        const usedByOtherTrack = (state.music || []).some(
          (m) => m.thumbnailFileId === removedTrack.thumbnailFileId
        );
        isThumbnailShared = usedByAlbum || usedByOtherTrack;
      }
      appendAuditRecord(state, {
        adminId: admin.id,
        action: 'MUSIC_DELETED',
        entityType: 'Music',
        entityId: id,
        metadata: {
          title: removedTrack.title,
          audioFileId: removedTrack.audioFileId || null,
          thumbnailFileId: removedTrack.thumbnailFileId || null,
        },
      });
    }
  });

  if (!removedTrack) {
    return NextResponse.json({ ok: false, error: 'Track not found.' }, { status: 404 });
  }

  if (removedTrack.audioFileId) {
    await deleteFileFromGoogleDrive(removedTrack.audioFileId);
  }
  if (removedTrack.thumbnailFileId && !isThumbnailShared) {
    await deleteFileFromGoogleDrive(removedTrack.thumbnailFileId);
  }

  revalidatePath('/');
  revalidatePath('/music');
  revalidatePath('/releases');

  return NextResponse.json({ ok: true });
}

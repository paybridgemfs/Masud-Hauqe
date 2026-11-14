import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import {
  getDbState,
  updateDbState,
  appendAuditRecord,
  createUniqueSlug,
  cuid,
  sortAlbumTracks,
} from '@/lib/db.js';
import { albumSchema } from '@/lib/validation.js';
import { deleteFileFromGoogleDrive } from '@/lib/google-drive.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'public';
  const db = await getDbState();
  const artist = db.artists?.[0] || { id: 'masud-hauqe', name: 'Masud Hauqe' };

  const albums = (db.albums || [])
    .filter((a) => (scope === 'admin' ? true : a.isPublished))
    .map((album) => {
      const tracks = sortAlbumTracks(
        (db.music || []).filter(
          (m) => m.albumId === album.id && (scope === 'admin' ? true : m.isPublished)
        )
      );
      return { ...album, artist, tracks, trackCount: tracks.length };
    });

  return NextResponse.json({ ok: true, albums });
}

export async function POST(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = albumSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Invalid album data.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let created = null;

    await updateDbState(async (state) => {
      const slug = await createUniqueSlug(state.albums, parsed.data.title);
      const artistObj = state.artists[0] || { id: 'masud-hauqe', name: 'Masud Hauqe' };
      const artistId = artistObj.id || 'masud-hauqe';
      const derivedYear =
        parsed.data.releaseYear?.trim() ||
        (parsed.data.releaseDate ? String(parsed.data.releaseDate).slice(0, 4) : '') ||
        String(new Date().getFullYear());
      created = {
        id: cuid(),
        title: parsed.data.title,
        slug,
        artistName: parsed.data.artistName?.trim() || artistObj.name || 'Masud Hauqe',
        genre: parsed.data.genre?.trim() || 'Contemporary',
        releaseYear: derivedYear,
        description: parsed.data.description || '',
        coverImage: parsed.data.coverImage || '',
        coverImageFileId: parsed.data.coverImageFileId || '',
        releaseDate: parsed.data.releaseDate || null,
        artistId,
        isPublished: Boolean(parsed.data.isPublished),
        createdAt: now,
        updatedAt: now,
      };
      state.albums.unshift(created);
      appendAuditRecord(state, {
        adminId: admin.id,
        action: 'ALBUM_CREATED',
        entityType: 'Album',
        entityId: created.id,
        metadata: { title: created.title },
      });
    });

    revalidatePath('/');
    revalidatePath('/releases');
    revalidatePath('/music');

    return NextResponse.json({ ok: true, album: created });
  } catch (err) {
    console.error('Create album error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to create album.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    id,
    title,
    artistName,
    genre,
    releaseYear,
    description,
    coverImage,
    coverImageFileId,
    releaseDate,
    isPublished,
    orderedTrackIds,
  } = body;
  let updated = null;
  let updatedTracks = null;
  let oldCoverFileIdToDelete = null;

  await updateDbState(async (state) => {
    const target = state.albums.find((a) => a.id === id);
    if (!target) return;

    // Support reordering tracks inside this Release via Drag & Drop
    if (Array.isArray(orderedTrackIds)) {
      const nowIso = new Date().toISOString();
      orderedTrackIds.forEach((trackId, index) => {
        const track = (state.music || []).find(
          (m) => m.id === trackId && m.albumId === target.id
        );
        if (track) {
          track.trackOrder = index + 1;
          track.updatedAt = nowIso;
        }
      });
    }

    if (typeof title === 'string' && title.trim()) {
      target.title = title.trim();
      target.slug = await createUniqueSlug(state.albums, target.title, target.id);
    }
    if (typeof artistName === 'string') target.artistName = artistName.trim();
    if (typeof genre === 'string') target.genre = genre.trim();
    if (typeof releaseYear === 'string') target.releaseYear = releaseYear.trim();
    if (typeof description === 'string') target.description = description.trim();
    if (typeof coverImage === 'string') {
      target.coverImage = coverImage.trim();
      for (const track of state.music || []) {
        if (track.albumId === target.id && !track.thumbnailFileId) {
          track.thumbnail = target.coverImage;
        }
      }
    }
    if (typeof coverImageFileId === 'string') {
      const nextId = coverImageFileId.trim();
      if (target.coverImageFileId && target.coverImageFileId !== nextId) {
        oldCoverFileIdToDelete = target.coverImageFileId;
      }
      target.coverImageFileId = nextId;
    }
    if (typeof releaseDate !== 'undefined') target.releaseDate = releaseDate || null;
    if (typeof isPublished === 'boolean') target.isPublished = isPublished;
    target.updatedAt = new Date().toISOString();
    updated = { ...target };
    updatedTracks = sortAlbumTracks(
      (state.music || []).filter((m) => m.albumId === target.id)
    );
    appendAuditRecord(state, {
      adminId: admin.id,
      action: 'ALBUM_UPDATED',
      entityType: 'Album',
      entityId: id,
      metadata: { title: updated.title },
    });
  });

  if (!updated) {
    return NextResponse.json({ ok: false, error: 'Album not found.' }, { status: 404 });
  }

  if (oldCoverFileIdToDelete) {
    await deleteFileFromGoogleDrive(oldCoverFileIdToDelete);
  }

  revalidatePath('/');
  revalidatePath('/releases');
  revalidatePath(`/releases/${updated.slug}`);
  revalidatePath('/music');

  return NextResponse.json({ ok: true, album: updated, tracks: updatedTracks });
}

export async function DELETE(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  let removedAlbum = null;

  await updateDbState((state) => {
    removedAlbum = state.albums.find((a) => a.id === id) || null;
    state.albums = state.albums.filter((a) => a.id !== id);
    for (const track of state.music) {
      if (track.albumId === id) {
        track.albumId = null;
      }
    }
    appendAuditRecord(state, {
      adminId: admin.id,
      action: 'ALBUM_DELETED',
      entityType: 'Album',
      entityId: id || '',
    });
  });

  if (removedAlbum?.coverImageFileId) {
    await deleteFileFromGoogleDrive(removedAlbum.coverImageFileId);
  }

  revalidatePath('/');
  revalidatePath('/releases');
  revalidatePath('/music');

  return NextResponse.json({ ok: true });
}

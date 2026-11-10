import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, appendAuditRecord } from '@/lib/db.js';
import { artistUpdateSchema, slugify } from '@/lib/validation.js';
import { deleteFileFromGoogleDrive } from '@/lib/google-drive.js';

export async function GET() {
  const db = await getDbState();
  const artist = db.artists?.[0] || null;
  return NextResponse.json({ ok: true, artist });
}

export async function PUT(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = artistUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || 'Invalid artist data.' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    let updatedArtist = null;
    const oldFileIdsToDelete = [];

    await updateDbState((state) => {
      const target = state.artists[0];
      if (target) {
        const nextProfileFileId = data.profileImageFileId || '';
        const nextCoverFileId = data.coverImageFileId || '';

        if (target.profileImageFileId && target.profileImageFileId !== nextProfileFileId) {
          oldFileIdsToDelete.push(target.profileImageFileId);
        }
        if (target.coverImageFileId && target.coverImageFileId !== nextCoverFileId) {
          oldFileIdsToDelete.push(target.coverImageFileId);
        }

        target.name = data.name;
        target.slug = data.slug ? slugify(data.slug) : slugify(data.name);
        target.shortBiography = data.shortBiography;
        target.biography = data.biography;
        target.careerInfo = data.careerInfo;
        target.musicalBg = data.musicalBg;
        target.profileImage = data.profileImage;
        target.profileImageFileId = nextProfileFileId;
        target.coverImage = data.coverImage;
        target.coverImageFileId = nextCoverFileId;
        target.location = data.location;
        target.website = data.website;
        target.achievements = data.achievements;
        target.updatedAt = now;
        updatedArtist = { ...target };
      }
      appendAuditRecord(state, {
        adminId: admin.id,
        action: 'ARTIST_PROFILE_UPDATED',
        entityType: 'Artist',
        entityId: updatedArtist?.id || 'masud-hauqe',
        metadata: { name: data.name },
      });
    });

    for (const oldId of oldFileIdsToDelete) {
      await deleteFileFromGoogleDrive(oldId);
    }

    revalidatePath('/');
    revalidatePath('/about');

    return NextResponse.json({ ok: true, artist: updatedArtist });
  } catch (err) {
    console.error('Update artist error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update artist profile.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getAuthenticatedDriveClient } from '@/lib/google-drive.js';
import { getDbState, collectReferencedMediaFileIds } from '@/lib/db.js';
import { requireAdminSession } from '@/lib/auth.js';

const SAFE_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

function resolveSafeMediaMime(rawMime) {
  const normalized = String(rawMime || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (SAFE_IMAGE_MIMES.has(normalized)) {
    return normalized === 'image/jpg' ? 'image/jpeg' : normalized;
  }
  return null;
}

export async function GET(_request, { params }) {
  const { fileId } = await params;
  const cleanId = String(fileId || '').trim();

  if (!cleanId || !/^[a-zA-Z0-9_-]{10,120}$/.test(cleanId)) {
    return NextResponse.json({ ok: false, error: 'Invalid Google Drive image file ID.' }, { status: 400 });
  }

  // Only allow serving Drive files referenced by the site CMS/catalog, OR authenticated admin previews
  const db = await getDbState();
  const referencedIds = collectReferencedMediaFileIds(db);
  if (!referencedIds.has(cleanId)) {
    const { authorized } = await requireAdminSession();
    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'Media asset not found.' }, { status: 404 });
    }
  }

  try {
    const { drive } = await getAuthenticatedDriveClient();
    const metaRes = await drive.files.get({
      fileId: cleanId,
      fields: 'mimeType, name',
    });
    const safeMime = resolveSafeMediaMime(metaRes.data?.mimeType || 'image/jpeg');
    if (!safeMime) {
      return NextResponse.json(
        { ok: false, error: 'Unsupported media content type.' },
        { status: 415 }
      );
    }

    const mediaRes = await drive.files.get(
      { fileId: cleanId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(mediaRes.data);
    const headers = new Headers();
    headers.set('Content-Type', safeMime);
    headers.set('Content-Length', String(buffer.length));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox");

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch {
    // Fallback to public Google Drive direct view if server token is temporarily unavailable
    try {
      const publicUrl = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(cleanId)}`;
      const upstream = await fetch(publicUrl, { signal: AbortSignal.timeout(8000) });
      if (upstream.ok) {
        const safeMime = resolveSafeMediaMime(upstream.headers.get('content-type') || 'image/jpeg');
        if (!safeMime) {
          return NextResponse.json(
            { ok: false, error: 'Unsupported media content type.' },
            { status: 415 }
          );
        }
        const arr = await upstream.arrayBuffer();
        const buffer = Buffer.from(arr);
        const headers = new Headers();
        headers.set('Content-Type', safeMime);
        headers.set('Content-Length', String(buffer.length));
        headers.set('Cache-Control', 'public, max-age=86400');
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
        return new NextResponse(buffer, { status: 200, headers });
      }
    } catch {
      // Ignore upstream fallback error
    }

    return NextResponse.json(
      { ok: false, error: 'Unable to load image from Google Drive.' },
      { status: 404 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getAuthenticatedDriveClient } from '@/lib/google-drive.js';

export async function GET(_request, { params }) {
  const { fileId } = await params;
  const cleanId = String(fileId || '').trim();

  if (!cleanId || !/^[a-zA-Z0-9_-]{10,120}$/.test(cleanId)) {
    return NextResponse.json({ ok: false, error: 'Invalid Google Drive image file ID.' }, { status: 400 });
  }

  try {
    const { drive } = await getAuthenticatedDriveClient();
    const metaRes = await drive.files.get({
      fileId: cleanId,
      fields: 'mimeType, name',
    });
    const mediaRes = await drive.files.get(
      { fileId: cleanId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(mediaRes.data);
    const headers = new Headers();
    headers.set('Content-Type', metaRes.data?.mimeType || 'image/jpeg');
    headers.set('Content-Length', String(buffer.length));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch {
    // Fallback to public Google Drive direct view if server token is temporarily unavailable
    try {
      const publicUrl = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(cleanId)}`;
      const upstream = await fetch(publicUrl);
      if (upstream.ok) {
        const arr = await upstream.arrayBuffer();
        const buffer = Buffer.from(arr);
        const headers = new Headers();
        headers.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
        headers.set('Content-Length', String(buffer.length));
        headers.set('Cache-Control', 'public, max-age=86400');
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

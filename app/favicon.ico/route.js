import { NextResponse } from 'next/server';
import { getPublicWebsiteData } from '@/lib/db.js';
import { getAuthenticatedDriveClient } from '@/lib/google-drive.js';

export const dynamic = 'force-dynamic';

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#09090B"/>
  <rect x="3" y="3" width="58" height="58" rx="10" fill="none" stroke="#C8A464" stroke-width="2" stroke-opacity="0.6"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#C8A464" font-family="sans-serif" font-weight="700" font-size="26">MH</text>
</svg>`;

function extractDriveFileIdFromUrl(url = '') {
  if (!url || typeof url !== 'string') return '';
  const mediaMatch = url.match(/\/api\/media\/([a-zA-Z0-9_-]{10,120})/);
  if (mediaMatch?.[1]) return mediaMatch[1];
  const lh3Match = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]{10,120})/);
  if (lh3Match?.[1]) return lh3Match[1];
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{10,120})/);
  if (idParamMatch?.[1]) return idParamMatch[1];
  return '';
}

export async function GET() {
  try {
    const { settings } = await getPublicWebsiteData();
    const fileId =
      (settings?.faviconFileId || '').trim() ||
      extractDriveFileIdFromUrl(settings?.faviconUrl || '');

    if (fileId && /^[a-zA-Z0-9_-]{10,120}$/.test(fileId)) {
      try {
        const { drive } = await getAuthenticatedDriveClient();
        const metaRes = await drive.files.get({
          fileId,
          fields: 'mimeType, name',
        });
        const mediaRes = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(mediaRes.data);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': metaRes.data?.mimeType || 'image/png',
            'Content-Length': String(buffer.length),
            'Cache-Control': 'public, max-age=3600, must-revalidate',
          },
        });
      } catch {
        // Fallback to public Google Drive direct view if server token is temporarily unavailable
        const publicUrl = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
        const upstream = await fetch(publicUrl);
        if (upstream.ok) {
          const arr = await upstream.arrayBuffer();
          const buffer = Buffer.from(arr);
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': upstream.headers.get('content-type') || 'image/png',
              'Content-Length': String(buffer.length),
              'Cache-Control': 'public, max-age=3600, must-revalidate',
            },
          });
        }
      }
    }
  } catch {
    // Fall through to default SVG icon
  }

  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

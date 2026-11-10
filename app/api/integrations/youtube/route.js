import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth.js';
import { fetchYouTubeMetadata } from '@/lib/youtube.js';
import { getDbState } from '@/lib/db.js';
import { getEnvConfig } from '@/lib/env.js';

export async function GET() {
  const { authorized } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const env = getEnvConfig();
  return NextResponse.json({
    ok: true,
    configured: env.youtube.isConfigured,
  });
}

export async function POST(request) {
  const { authorized } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { youtubeUrl } = body;
    const result = await fetchYouTubeMetadata(youtubeUrl);
    if (!result.ok) {
      const status =
        result.code === 'INVALID_YOUTUBE_URL'
          ? 400
          : result.code === 'YOUTUBE_QUOTA_EXCEEDED'
          ? 429
          : 422;
      return NextResponse.json(result, { status });
    }

    const db = await getDbState();
    const defaultArtistName = db.artists?.[0]?.name || 'Masud Hauqe';

    return NextResponse.json({
      ok: true,
      metadata: {
        ...result.metadata,
        artistName: defaultArtistName,
      },
    });
  } catch (err) {
    console.error('YouTube fetch route error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to process YouTube metadata request.' },
      { status: 500 }
    );
  }
}

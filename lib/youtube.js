import { getEnvConfig } from './env.js';
import { extractYouTubeVideoId, formatIsoDuration } from './validation.js';

export async function fetchYouTubeMetadata(videoUrl) {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    return {
      ok: false,
      code: 'INVALID_YOUTUBE_URL',
      error: 'Please enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID).',
    };
  }

  const { youtube } = getEnvConfig();
  if (!youtube.isConfigured) {
    return {
      ok: false,
      code: 'YOUTUBE_API_KEY_MISSING',
      error:
        'YOUTUBE_API_KEY is not configured in environment variables (.env). Please configure YOUTUBE_API_KEY in .env to fetch metadata automatically via YouTube Data API v3.',
    };
  }

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'snippet,contentDetails');
  endpoint.searchParams.set('id', videoId);
  endpoint.searchParams.set('key', youtube.apiKey);

  try {
    const res = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
      const reason = data?.error?.errors?.[0]?.reason || '';
      if (res.status === 403 && reason.includes('quota')) {
        return {
          ok: false,
          code: 'YOUTUBE_QUOTA_EXCEEDED',
          error: 'YouTube Data API v3 daily quota has been exceeded. Please try again later or check your Google Cloud quota.',
        };
      }
      return {
        ok: false,
        code: 'YOUTUBE_API_ERROR',
        error: data?.error?.message || `YouTube Data API v3 returned HTTP ${res.status}.`,
      };
    }

    const item = data?.items?.[0];
    if (!item) {
      return {
        ok: false,
        code: 'VIDEO_NOT_FOUND',
        error: `No public YouTube video found for ID "${videoId}". Verify that the video exists and is public.`,
      };
    }

    const snippet = item.snippet || {};
    const contentDetails = item.contentDetails || {};
    const thumbnails = snippet.thumbnails || {};
    const bestThumbnail =
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      '';

    return {
      ok: true,
      metadata: {
        youtubeVideoId: videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: snippet.title || '',
        thumbnail: bestThumbnail,
        duration: formatIsoDuration(contentDetails.duration),
        channelTitle: snippet.channelTitle || '',
        publishedAt: snippet.publishedAt || '',
      },
    };
  } catch (err) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      error: `Failed to reach YouTube Data API v3: ${err instanceof Error ? err.message : 'Network error'}`,
    };
  }
}

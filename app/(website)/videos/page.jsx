import React from 'react';
import Link from 'next/link';
import { Video } from 'lucide-react';
import { getPublicWebsiteData } from '@/lib/db.js';

export const revalidate = 60;

export const metadata = {
  title: 'Official Videos — Masud Hauqe',
  description: 'Watch official YouTube music videos and studio performances by Masud Hauqe.',
};

export default async function VideosPage() {
  const { artist, publishedMusic } = await getPublicWebsiteData();
  const videoTracks = publishedMusic.filter((m) => m.youtubeVideoId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-10">
      <div className="border-b border-[#222226] pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">VISUAL ARCHIVE</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA] mt-1">
            Official Music Videos
          </h1>
          <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">
            Official YouTube embedded video performances associated with published recordings by {artist?.name || 'Masud Hauqe'}.
          </p>
        </div>
        <span className="text-xs text-[#8E8E96] tabular-nums">{videoTracks.length} Videos</span>
      </div>

      {videoTracks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoTracks.map((track) => (
            <article
              key={track.id}
              className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden flex flex-col"
            >
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${track.youtubeVideoId}`}
                  title={track.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#F4F1EA] truncate">{track.title}</h2>
                  <p className="text-xs text-[#8E8E96] mt-0.5 truncate">
                    {artist?.name || 'Masud Hauqe'} · Duration {track.duration || '0:00'}
                  </p>
                </div>
                <Link
                  href={`/music/${track.slug}`}
                  className="px-3.5 py-2 rounded border border-[#2E2E38] text-xs font-semibold text-[#C8A464] hover:border-[#C8A464] whitespace-nowrap shrink-0"
                >
                  Audio Master
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-12 text-center max-w-xl mx-auto space-y-3">
          <Video className="w-9 h-9 text-[#C8A464] mx-auto" />
          <h2 className="text-lg font-semibold text-[#F4F1EA]">No Official Videos Published Yet</h2>
          <p className="text-sm text-[#8E8E96] leading-relaxed">
            When tracks are added via YouTube URL in the Admin Add Music workflow, their embedded YouTube videos appear automatically on this page.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/music/add"
              className="inline-flex items-center px-4 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold hover:bg-[#D4B475] transition-colors"
            >
              Add Track with YouTube URL
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

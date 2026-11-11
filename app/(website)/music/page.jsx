import React from 'react';
import { getPublicWebsiteData } from '@/lib/db.js';
import MusicLibraryClient from '@/components/music/MusicLibraryClient.jsx';

export const revalidate = 60;

export async function generateMetadata() {
  const { seoSettings, artist } = await getPublicWebsiteData();
  const seo = (seoSettings || []).find((s) => s.page === 'music');
  return {
    title: seo?.metaTitle || `Music Library — ${artist?.name || 'Masud Hauqe'}`,
    description:
      seo?.metaDescription ||
      `Stream and download official published recordings by ${artist?.name || 'Masud Hauqe'}.`,
  };
}

export default async function MusicPage() {
  const { artist, publishedMusic, publishedAlbums } = await getPublicWebsiteData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-10">
      <div className="border-b border-[#222226] pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">
            MASTER AUDIO REPERTOIRE
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA] mt-1">
            Official Music Library
          </h1>
          <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">
            Stream authorized master recordings by {artist?.name || 'Masud Hauqe'} or download high-resolution MP3 files directly when enabled.
          </p>
        </div>
        <div className="text-xs text-[#8E8E96] tabular-nums">
          <span>{publishedMusic.length} Published Tracks</span>
          <span aria-hidden="true"> · </span>
          <span>{publishedAlbums.length} Releases</span>
        </div>
      </div>

      <MusicLibraryClient initialMusic={publishedMusic} albums={publishedAlbums} />
    </div>
  );
}

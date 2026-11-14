import React from 'react';
import { getPublicWebsiteData } from '@/lib/db.js';
import { buildPageSocialMetadata } from '@/lib/seo.js';
import MusicLibraryClient from '@/components/music/MusicLibraryClient.jsx';

export const revalidate = 60;

export async function generateMetadata() {
  return buildPageSocialMetadata({ pageId: 'music', path: '/music' });
}

export default async function MusicPage() {
  const { artist, publishedMusic, publishedAlbums } = await getPublicWebsiteData();
  const singlePublishedMusic = (publishedMusic || []).filter((m) => !m.albumId);

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
            Stream authorized master recordings{artist?.name ? ` by ${artist.name}` : ''} or download high-resolution MP3 files directly when enabled.
          </p>
        </div>
        <div className="text-xs text-[#8E8E96] tabular-nums">
          <span>{singlePublishedMusic.length} Single Tracks</span>
          <span aria-hidden="true"> · </span>
          <span>{publishedAlbums.length} Releases</span>
        </div>
      </div>

      <MusicLibraryClient initialMusic={singlePublishedMusic} />
    </div>
  );
}

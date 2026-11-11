import React from 'react';
import Link from 'next/link';
import { Disc } from 'lucide-react';
import { getPublicWebsiteData } from '@/lib/db.js';
import AlbumCard from '@/components/music/AlbumCard.jsx';

export const revalidate = 60;

export const metadata = {
  title: 'Albums & Discography — Masud Hauqe',
  description: 'Explore studio albums, anthologies, and tracklists by Masud Hauqe.',
};

export default async function AlbumsPage() {
  const { artist, publishedAlbums } = await getPublicWebsiteData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-10">
      <div className="border-b border-[#222226] pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">DISCOGRAPHY</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA] mt-1">
            Studio Albums & Collections
          </h1>
          <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">
            Complete multi-track releases and studio anthologies by {artist?.name || 'Masud Hauqe'}.
          </p>
        </div>
        <span className="text-xs text-[#8E8E96] tabular-nums">
          {publishedAlbums.length} Published Albums
        </span>
      </div>

      {publishedAlbums.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {publishedAlbums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-12 text-center max-w-xl mx-auto space-y-3">
          <Disc className="w-9 h-9 text-[#C8A464] mx-auto" />
          <h2 className="text-lg font-semibold text-[#F4F1EA]">No Published Albums Yet</h2>
          <p className="text-sm text-[#8E8E96] leading-relaxed">
            Studio albums created and published in the Admin Dashboard will be showcased here with their complete tracklists.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/albums"
              className="inline-flex items-center px-4 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold hover:bg-[#D4B475] transition-colors"
            >
              Create First Album in Admin CMS
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

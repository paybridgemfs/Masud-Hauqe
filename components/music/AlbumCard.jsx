'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Disc } from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';

export default function AlbumCard({ album }) {
  const { playAlbum } = usePlayer();
  const tracks = album.tracks || [];
  const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;

  return (
    <article className="group bg-[#111115] border border-[#222228] hover:border-[#C8A464]/50 rounded-lg overflow-hidden transition-colors flex flex-col">
      <div className="relative aspect-square bg-[#16161B] overflow-hidden border-b border-[#1E1E24]">
        {album.coverImage ? (
          <Image
            src={album.coverImage}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            referrerPolicy="no-referrer"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#191815] via-[#111115] to-[#0B0B0E] p-4 text-center">
            <Disc className="w-8 h-8 text-[#C8A464]/75 mb-1.5" />
            <span className="text-[10px] tracking-[0.14em] text-[#9A9AA2]">ALBUM</span>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors flex items-center justify-center">
            <button
              type="button"
              onClick={() => playAlbum(tracks, 0)}
              aria-label={`Play album ${album.title}`}
              className="w-10 h-10 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
        <h3 className="text-xs sm:text-sm font-semibold text-[#F4F1EA] group-hover:text-[#C8A464] transition-colors line-clamp-1">
          <Link href={`/albums/${album.slug}`}>{album.title}</Link>
        </h3>
        <div className="flex items-center justify-between gap-1 text-[11px] text-[#8E8E96] tabular-nums">
          <span className="truncate">{album.trackCount ?? tracks.length} tracks</span>
          {releaseYear && !Number.isNaN(releaseYear) ? (
            <span>{releaseYear}</span>
          ) : (
            <Link
              href={`/albums/${album.slug}`}
              className="text-[#C8A464] hover:underline shrink-0"
            >
              Open →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

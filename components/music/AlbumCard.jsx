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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            referrerPolicy="no-referrer"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#191815] via-[#111115] to-[#0B0B0E] p-6 text-center">
            <Disc className="w-12 h-12 text-[#C8A464]/75 mb-3" />
            <span className="text-xs tracking-[0.16em] text-[#9A9AA2]">STUDIO ALBUM</span>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
            <button
              type="button"
              onClick={() => playAlbum(tracks, 0)}
              aria-label={`Play album ${album.title}`}
              className="px-3.5 py-2 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Album</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#9A9AA2] tabular-nums mb-1">
            <span>{album.artist?.name || 'Masud Hauqe'}</span>
            <span aria-hidden="true">·</span>
            <span>{album.trackCount ?? tracks.length} tracks</span>
            {releaseYear && !Number.isNaN(releaseYear) && (
              <>
                <span aria-hidden="true">·</span>
                <span>{releaseYear}</span>
              </>
            )}
          </div>
          <h3 className="text-base font-semibold text-[#F4F1EA] group-hover:text-[#C8A464] transition-colors">
            <Link href={`/albums/${album.slug}`}>{album.title}</Link>
          </h3>
          {album.description && (
            <p className="text-xs text-[#8E8E96] mt-1 line-clamp-2 leading-relaxed">
              {album.description}
            </p>
          )}
        </div>

        <div className="pt-2">
          <Link
            href={`/albums/${album.slug}`}
            className="text-xs font-medium text-[#C8A464] hover:underline"
          >
            View Tracklist & Liner Notes →
          </Link>
        </div>
      </div>
    </article>
  );
}

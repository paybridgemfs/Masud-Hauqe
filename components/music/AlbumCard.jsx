'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Play, Disc } from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';

export default function AlbumCard({ album }) {
  const { playAlbum } = usePlayer();
  const tracks = album.tracks || [];
  const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group bg-[#111115] border border-[#222228] hover:border-[#C8A464]/50 rounded-lg overflow-hidden transition-colors flex flex-col shadow-sm hover:shadow-xl hover:shadow-black/40"
    >
      <div className="relative aspect-[16/10] bg-[#16161B] overflow-hidden border-b border-[#1E1E24]">
        {album.coverImage ? (
          <Image
            src={album.coverImage}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            referrerPolicy="no-referrer"
            className="object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#191815] via-[#111115] to-[#0B0B0E] p-3 text-center">
            <Disc className="w-6 h-6 sm:w-7 sm:h-7 text-[#C8A464]/75 mb-1" />
            <span className="text-[9px] sm:text-[10px] tracking-[0.14em] text-[#9A9AA2]">ALBUM</span>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors flex items-center justify-center">
            <button
              type="button"
              onClick={() => playAlbum(tracks, 0)}
              aria-label={`Play album ${album.title}`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-0.5">
        <h3 className="text-xs sm:text-sm font-semibold text-[#F4F1EA] group-hover:text-[#C8A464] transition-colors leading-snug line-clamp-1">
          <Link href={`/albums/${album.slug}`}>{album.title}</Link>
        </h3>
        <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-[#8E8E96] tabular-nums">
          <span className="truncate">{album.trackCount ?? tracks.length} tracks</span>
          {releaseYear && !Number.isNaN(releaseYear) ? (
            <span>{releaseYear}</span>
          ) : (
            <Link
              href={`/albums/${album.slug}`}
              className="text-[#C8A464] hover:underline font-medium"
            >
              Open →
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Play, Pause, Disc } from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';
import MiniEqualizerBars from '@/components/ui/MiniEqualizerBars.jsx';

export default function AlbumCard({ album, index = 0 }) {
  const { currentTrack, isPlaying, playAlbum, togglePlay } = usePlayer();
  const tracks = album.tracks || [];
  const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;
  const isReleaseCurrent = Boolean(
    currentTrack &&
      (currentTrack.albumId === album.id || tracks.some((t) => t.id === currentTrack.id))
  );
  const activePlaying = isReleaseCurrent && isPlaying;
  const staggerDelay = Math.min((Number(index) % 8) * 0.06, 0.42);

  return (
    <motion.article
      initial={{ opacity: 0, y: 22, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-25px' }}
      whileHover={{ y: -5 }}
      transition={{
        duration: 0.48,
        delay: staggerDelay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`group bg-[#111115] border rounded-lg overflow-hidden transition-all duration-300 flex flex-col ${
        isReleaseCurrent
          ? 'border-[#C8A464]/80 shadow-[0_0_28px_rgba(200,164,100,0.14)]'
          : 'border-[#222228] hover:border-[#C8A464]/50 shadow-sm hover:shadow-xl hover:shadow-black/40'
      }`}
    >
      <div className="relative aspect-[16/10] bg-[#16161B] overflow-hidden border-b border-[#1E1E24]">
        {album.coverImage ? (
          <ShimmerImage
            src={album.coverImage}
            alt={album.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#191815] via-[#111115] to-[#0B0B0E] p-3 text-center">
            <Disc
              className={`w-6 h-6 sm:w-7 sm:h-7 text-[#C8A464]/75 mb-1 ${
                activePlaying ? 'animate-spin' : ''
              }`}
              style={activePlaying ? { animationDuration: '6s' } : undefined}
            />
            <span className="text-[9px] sm:text-[10px] tracking-[0.14em] text-[#9A9AA2]">RELEASE</span>
          </div>
        )}

        {isReleaseCurrent && (
          <div className="absolute top-2 left-2 z-[3] inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#09090B]/85 backdrop-blur-md border border-[#C8A464]/50 shadow-md">
            <MiniEqualizerBars isPlaying={activePlaying} size="sm" />
            <span className="text-[9px] font-bold tracking-wider uppercase text-[#C8A464]">
              {activePlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        )}

        {tracks.length > 0 && (
          <div className="absolute inset-0 z-[2] bg-black/30 group-hover:bg-black/45 transition-colors flex items-center justify-center">
            <button
              type="button"
              onClick={() => (isReleaseCurrent ? togglePlay() : playAlbum(tracks, 0))}
              aria-label={`Play release ${album.title}`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95"
            >
              {activePlaying ? (
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-0.5">
        <h3
          className={`text-xs sm:text-sm font-semibold transition-colors leading-snug line-clamp-1 ${
            isReleaseCurrent ? 'text-[#C8A464]' : 'text-[#F4F1EA] group-hover:text-[#C8A464]'
          }`}
        >
          <Link href={`/releases/${album.slug}`}>{album.title}</Link>
        </h3>
        <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-[#8E8E96] tabular-nums">
          <span className="truncate">{album.trackCount ?? tracks.length} tracks</span>
          {releaseYear && !Number.isNaN(releaseYear) ? (
            <span>{releaseYear}</span>
          ) : (
            <Link
              href={`/releases/${album.slug}`}
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


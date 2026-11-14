'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Play, Pause, Download, Disc3, Loader2 } from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import {
  getPublicDownloadUrl,
  getTrackDownloadFilename,
} from '@/lib/storage/audio-delivery.js';
import { triggerManagedDownload } from '@/lib/client-download.js';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';
import MiniEqualizerBars from '@/components/ui/MiniEqualizerBars.jsx';

export default function MusicCard({ track, queue = [], index = 0 }) {
  const { currentTrack, isPlaying, isLoading, playTrack } = usePlayer();
  const [isDownloading, setIsDownloading] = useState(false);
  const isCurrent = currentTrack?.id === track.id;
  const activePlaying = isCurrent && isPlaying;
  const activeLoading = isCurrent && isLoading;
  const downloadUrl = getPublicDownloadUrl(track);
  const downloadFilename = getTrackDownloadFilename(track);
  const staggerDelay = Math.min((Number(index) % 8) * 0.06, 0.42);

  async function handleDownload(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!downloadUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      await triggerManagedDownload(downloadUrl, downloadFilename);
    } finally {
      setIsDownloading(false);
    }
  }

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
        isCurrent
          ? 'border-[#C8A464]/80 shadow-[0_0_28px_rgba(200,164,100,0.14)]'
          : 'border-[#222228] hover:border-[#C8A464]/50 shadow-sm hover:shadow-xl hover:shadow-black/40'
      }`}
    >
      {/* Artwork / Thumbnail with Centered Play Button & Active Mini Equalizer */}
      <div className="relative aspect-[16/10] bg-[#17171C] overflow-hidden border-b border-[#1E1E24]">
        {track.thumbnail ? (
          <ShimmerImage
            src={track.thumbnail}
            alt={track.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-700 ease-out ${
              activePlaying ? 'scale-[1.04]' : 'group-hover:scale-[1.05]'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#17171C] via-[#111115] to-[#1F1B14] p-3 sm:p-4 text-center">
            <Disc3
              className={`w-6 h-6 sm:w-8 sm:h-8 text-[#C8A464]/70 mb-1 ${
                activePlaying ? 'animate-spin' : ''
              }`}
              style={activePlaying ? { animationDuration: '6s' } : undefined}
            />
            <span className="text-[9px] sm:text-[10px] tracking-[0.14em] text-[#8E8E96]">
              MASTER
            </span>
          </div>
        )}

        {/* Active Track Top-Left Mini Equalizer Badge */}
        {isCurrent && (
          <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-[3] inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#09090B]/85 backdrop-blur-md border border-[#C8A464]/50 shadow-md">
            <MiniEqualizerBars isPlaying={activePlaying} size="sm" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase text-[#C8A464]">
              {activePlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        )}

        <div className="absolute inset-0 z-[2] bg-black/35 group-hover:bg-black/45 transition-colors flex items-center justify-center">
          <button
            type="button"
            disabled={activeLoading}
            onClick={() => playTrack(track, queue)}
            aria-label={activePlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 disabled:opacity-75 disabled:cursor-wait ${
              activePlaying ? 'ring-4 ring-[#C8A464]/25' : ''
            }`}
          >
            {activeLoading ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-spin" />
            ) : activePlaying ? (
              <Pause className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-current ml-0.5" />
            )}
          </button>

          <span className="absolute bottom-1.5 right-2 sm:bottom-2.5 sm:right-3 text-[10px] sm:text-[11px] font-medium text-[#F4F1EA] tabular-nums">
            {track.duration || '0:00'}
          </span>
        </div>
      </div>

      {/* Compact Metadata (No Description, Responsive for 2-Col Mobile) */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-[#9A9AA2] mb-0.5 sm:mb-1 truncate">
            {track.artist?.name && (
              <span className="truncate">{track.artist.name}</span>
            )}
            {track.album?.title && (
              <>
                <span aria-hidden="true">·</span>
                <Link
                  href={`/releases/${track.album.slug}`}
                  className="hover:text-[#C8A464] transition-colors truncate"
                >
                  {track.album.title}
                </Link>
              </>
            )}
          </div>

          <h3
            className={`text-xs sm:text-sm font-semibold transition-colors leading-snug line-clamp-2 sm:line-clamp-1 break-words flex items-center gap-1.5 ${
              isCurrent
                ? 'text-[#C8A464]'
                : 'text-[#F4F1EA] group-hover:text-[#C8A464]'
            }`}
          >
            <Link href={`/music/${track.slug}`} className="truncate">
              {track.title}
            </Link>
          </h3>
        </div>

        <div className="pt-1.5 sm:pt-2.5 border-t border-[#1D1D22] flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px] text-[#8E8E96]">
          <div className="flex items-center gap-1 tabular-nums min-w-0 truncate">
            <span className="truncate">{track.playCount || 0} plays</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <Link
              href={`/music/${track.slug}`}
              className="hidden sm:inline text-[#D4D4D8] hover:text-[#C8A464] transition-colors"
            >
              Details
            </Link>
          </div>

          {downloadUrl ? (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              aria-label={`Download ${track.title} MP3`}
              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[#C8A464] hover:text-[#D4B475] transition-colors whitespace-nowrap shrink-0 disabled:opacity-65 disabled:cursor-wait"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Wait...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>MP3</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] text-[#6E6E77] shrink-0">Stream</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}


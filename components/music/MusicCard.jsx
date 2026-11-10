'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Download, Disc3 } from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import { getPublicDownloadUrl } from '@/lib/storage/audio-delivery.js';

export default function MusicCard({ track, queue = [] }) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const activePlaying = isCurrent && isPlaying;
  const downloadUrl = getPublicDownloadUrl(track);

  return (
    <article className="group bg-[#111115] border border-[#222228] hover:border-[#C8A464]/50 rounded-lg overflow-hidden transition-colors flex flex-col">
      {/* Artwork Container */}
      <div className="relative aspect-[4/3] bg-[#16161B] overflow-hidden border-b border-[#1E1E24]">
        {track.thumbnail ? (
          <Image
            src={track.thumbnail}
            alt={track.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            referrerPolicy="no-referrer"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#17171C] via-[#111115] to-[#1F1B14] p-6 text-center">
            <Disc3 className="w-10 h-10 text-[#C8A464]/70 mb-2" />
            <span className="text-xs tracking-[0.15em] text-[#8E8E96]">MASTER RECORDING</span>
          </div>
        )}

        {/* Scrim & Play Trigger */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end justify-between p-4">
          <button
            type="button"
            onClick={() => playTrack(track, queue)}
            aria-label={activePlaying ? `Pause ${track.title}` : `Play ${track.title}`}
            className="w-11 h-11 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center shadow-lg transition-transform active:scale-95"
          >
            {activePlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <span className="text-xs font-medium text-[#F4F1EA] tabular-nums">
            {track.duration || '0:00'}
          </span>
        </div>
      </div>

      {/* Editorial Metadata (Unboxed, Zero-Pill Discipline) */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#9A9AA2] mb-1">
            <span>{track.artist?.name || 'Masud Hauqe'}</span>
            {track.album?.title && (
              <>
                <span aria-hidden="true">·</span>
                <Link
                  href={`/albums/${track.album.slug}`}
                  className="hover:text-[#C8A464] transition-colors truncate"
                >
                  {track.album.title}
                </Link>
              </>
            )}
          </div>

          <h3 className="text-base font-semibold text-[#F4F1EA] group-hover:text-[#C8A464] transition-colors line-clamp-1">
            <Link href={`/music/${track.slug}`}>{track.title}</Link>
          </h3>

          {track.description && (
            <p className="text-xs text-[#8E8E96] mt-1.5 line-clamp-2 leading-relaxed">
              {track.description}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-[#1D1D22] flex items-center justify-between gap-2 text-xs text-[#8E8E96]">
          <div className="flex items-center gap-2 tabular-nums">
            <span>{track.playCount || 0} plays</span>
            <span aria-hidden="true">·</span>
            <Link
              href={`/music/${track.slug}`}
              className="text-[#D4D4D8] hover:text-[#C8A464] transition-colors"
            >
              Track Details
            </Link>
          </div>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              aria-label={`Download ${track.title} MP3`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C8A464] hover:text-[#D4B475] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>MP3</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

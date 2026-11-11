'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
  Play,
  Pause,
  Download,
  Disc,
  ArrowLeft,
  Clock,
  Calendar,
  Music2,
  Headphones,
  Share2,
  Check,
} from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import { getPublicDownloadUrl } from '@/lib/storage/audio-delivery.js';

function parseDurationToSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map((n) => Number(n));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatTotalRuntime(tracks = []) {
  const totalSecs = tracks.reduce((acc, t) => acc + parseDurationToSeconds(t.duration), 0);
  if (totalSecs <= 0) return `${tracks.length} Tracks`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export default function AlbumDetailClient({ album }) {
  const { currentTrack, isPlaying, playAlbum, playTrack } = usePlayer();
  const [copied, setCopied] = useState(false);

  const tracks = album.tracks || [];
  const releaseDateStr = album.releaseDate
    ? new Date(album.releaseDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Official Release';

  const totalPlays = tracks.reduce((sum, t) => sum + Number(t.playCount || 0), 0);
  const totalRuntime = formatTotalRuntime(tracks);

  function handleShareAlbum() {
    if (typeof window === 'undefined') return;
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/albums"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#9A9AA2] hover:text-[#C8A464] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Albums</span>
        </Link>
      </motion.div>

      {/* Album Header */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch bg-[#111115] border border-[#222228] rounded-lg p-5 sm:p-8 lg:p-10 shadow-xl"
      >
        <div className="lg:col-span-4 flex">
          <div className="relative w-full aspect-square rounded-lg bg-[#16161C] border border-[#26262E] overflow-hidden flex items-center justify-center shadow-lg">
            {album.coverImage ? (
              <Image
                src={album.coverImage}
                alt={album.title}
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            ) : (
              <div className="text-center p-8">
                <Disc className="w-16 h-16 text-[#C8A464] mx-auto mb-3" />
                <span className="text-xs tracking-[0.2em] text-[#8E8E96]">STUDIO ALBUM</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#C8A464] tracking-wider uppercase tabular-nums">
                <span>{album.artist?.name || 'Masud Hauqe'}</span>
                <span aria-hidden="true">·</span>
                <span>Studio Album Collection</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F4F1EA] leading-tight">
                {album.title}
              </h1>

              {album.description && (
                <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed whitespace-pre-line pt-1">
                  {album.description}
                </p>
              )}
            </div>

            {/* Album Studio Specifications Grid (Fills blank space cleanly) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Music2 className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>RECORDINGS</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums">
                  {tracks.length} Master Tracks
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Clock className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>RUNTIME</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums">
                  {totalRuntime}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Calendar className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>RELEASE DATE</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] truncate">
                  {releaseDateStr}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Headphones className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>TOTAL STREAMS</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums">
                  {totalPlays} Plays
                </p>
              </div>
            </div>

            {/* Track Highlights Preview Box */}
            {tracks.length > 0 && (
              <div className="p-4 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#8E8E96]">
                  <span>INCLUDED MASTER RECORDINGS</span>
                  <span className="text-[#C8A464]">Direct Stream & MP3</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tracks.slice(0, 5).map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => playTrack(t, tracks)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141419] hover:bg-[#1E1D18] border border-[#24242C] hover:border-[#C8A464]/50 text-xs text-[#E4E4E7] transition-colors"
                    >
                      <span className="text-[10px] text-[#C8A464] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate max-w-[160px]">{t.title}</span>
                    </button>
                  ))}
                  {tracks.length > 5 && (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs text-[#8E8E96]">
                      +{tracks.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-5 border-t border-[#1E1E24] flex flex-wrap items-center gap-3 sm:gap-4">
            {tracks.length > 0 && (
              <button
                type="button"
                onClick={() => playAlbum(tracks, 0)}
                className="px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Complete Album</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShareAlbum}
              className="px-4 py-3 rounded border border-[#27272E] bg-[#0B0B0E] text-[#D4D4D8] hover:border-[#C8A464] hover:text-[#C8A464] text-xs font-semibold flex items-center gap-2 transition-colors ml-auto"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#4ADE80]" />
                  <span className="text-[#4ADE80]">Album Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Album</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.section>

      {/* Album Tracklist */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-bold text-[#F4F1EA]">Album Tracklist</h2>

        {tracks.length > 0 ? (
          <div className="bg-[#111115] border border-[#222228] rounded-lg divide-y divide-[#1E1E24] overflow-hidden">
            {tracks.map((track, idx) => {
              const active = currentTrack?.id === track.id;
              const activePlaying = active && isPlaying;
              const downloadUrl = getPublicDownloadUrl(track);

              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.3) }}
                  className={`px-4 sm:px-6 py-4 flex items-center justify-between gap-4 transition-colors ${
                    active ? 'bg-[#181714]' : 'hover:bg-[#15151A]'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs text-[#8E8E96] tabular-nums w-6">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => playTrack(track, tracks)}
                      aria-label={activePlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                      className="w-9 h-9 rounded-full bg-[#1E1E24] hover:bg-[#C8A464] text-[#F4F1EA] hover:text-[#09090B] flex items-center justify-center transition-all hover:scale-105 shrink-0"
                    >
                      {activePlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <Link
                        href={`/music/${track.slug}`}
                        className="text-sm sm:text-base font-semibold text-[#F4F1EA] hover:text-[#C8A464] truncate block transition-colors"
                      >
                        {track.title}
                      </Link>
                      <p className="text-xs text-[#8E8E96] truncate">
                        {album.artist?.name || 'Masud Hauqe'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-[#8E8E96] tabular-nums">
                      {track.duration || '0:00'}
                    </span>
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download
                        aria-label={`Download ${track.title} MP3`}
                        className="p-2 text-[#9A9AA2] hover:text-[#C8A464] transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#111115] border border-[#222228] rounded-lg p-8 text-center">
            <p className="text-sm text-[#8E8E96]">
              No published tracks are assigned to this album yet. Assign tracks in the Admin Music Manager.
            </p>
          </div>
        )}
      </motion.section>
    </div>
  );
}

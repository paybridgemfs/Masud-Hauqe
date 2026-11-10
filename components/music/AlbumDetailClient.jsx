'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Download, Disc, ArrowLeft } from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import { getPublicDownloadUrl } from '@/lib/storage/audio-delivery.js';

export default function AlbumDetailClient({ album }) {
  const { currentTrack, isPlaying, playAlbum, playTrack } = usePlayer();
  const tracks = album.tracks || [];
  const releaseDateStr = album.releaseDate
    ? new Date(album.releaseDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      <div>
        <Link
          href="/albums"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#9A9AA2] hover:text-[#C8A464] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Albums</span>
        </Link>
      </div>

      {/* Album Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch bg-[#111115] border border-[#222228] rounded-lg p-6 sm:p-10">
        <div className="lg:col-span-4">
          <div className="relative aspect-square rounded-lg bg-[#16161C] border border-[#26262E] overflow-hidden flex items-center justify-center">
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#C8A464] tracking-wider tabular-nums">
              <span>{album.artist?.name || 'Masud Hauqe'}</span>
              <span aria-hidden="true">·</span>
              <span>{tracks.length} Tracks</span>
              {releaseDateStr && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Released {releaseDateStr}</span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA]">{album.title}</h1>

            {album.description ? (
              <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed whitespace-pre-line">
                {album.description}
              </p>
            ) : (
              <p className="text-sm text-[#8E8E96]">
                Official studio album curated by {album.artist?.name || 'Masud Hauqe'}.
              </p>
            )}
          </div>

          {tracks.length > 0 && (
            <div className="pt-4 border-t border-[#1E1E24]">
              <button
                type="button"
                onClick={() => playAlbum(tracks, 0)}
                className="px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Complete Album</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Album Tracklist */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#F4F1EA]">Album Tracklist</h2>

        {tracks.length > 0 ? (
          <div className="bg-[#111115] border border-[#222228] rounded-lg divide-y divide-[#1E1E24]">
            {tracks.map((track, idx) => {
              const active = currentTrack?.id === track.id;
              const activePlaying = active && isPlaying;
              const downloadUrl = getPublicDownloadUrl(track);

              return (
                <div
                  key={track.id}
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
                      className="w-9 h-9 rounded-full bg-[#1E1E24] hover:bg-[#C8A464] text-[#F4F1EA] hover:text-[#09090B] flex items-center justify-center transition-colors shrink-0"
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
                        className="text-sm sm:text-base font-semibold text-[#F4F1EA] hover:text-[#C8A464] truncate block"
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
                </div>
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
      </section>
    </div>
  );
}

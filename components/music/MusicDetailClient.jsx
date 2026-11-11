'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Download, Disc3, ArrowLeft } from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import { getPublicDownloadUrl } from '@/lib/storage/audio-delivery.js';
import AudioWaveform, { LiveSpectrumBadge } from '@/components/player/AudioWaveform.jsx';
import MusicCard from './MusicCard.jsx';

export default function MusicDetailClient({ track, relatedTracks = [] }) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playTrack,
    seekTo,
  } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const activePlaying = isCurrent && isPlaying;
  const downloadUrl = getPublicDownloadUrl(track);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      <div>
        <Link
          href="/music"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#9A9AA2] hover:text-[#C8A464] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Music Library</span>
        </Link>
      </div>

      {/* Primary Track Showcase */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch bg-[#111115] border border-[#222228] rounded-lg p-6 sm:p-10">
        <div className="lg:col-span-5">
          <div className="relative aspect-square rounded-lg bg-[#16161C] border border-[#26262E] overflow-hidden flex items-center justify-center">
            {track.thumbnail ? (
              <Image
                src={track.thumbnail}
                alt={track.title}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            ) : (
              <div className="text-center p-8">
                <Disc3 className="w-16 h-16 text-[#C8A464] mx-auto mb-3" />
                <span className="text-xs tracking-[0.2em] text-[#8E8E96]">MASTER AUDIO</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#C8A464] tracking-wider">
              <span>{track.artist?.name || 'Masud Hauqe'}</span>
              {track.album && (
                <>
                  <span aria-hidden="true">·</span>
                  <Link href={`/albums/${track.album.slug}`} className="hover:underline">
                    Album: {track.album.title}
                  </Link>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Duration {track.duration || '0:00'}</span>
              {activePlaying && (
                <>
                  <span aria-hidden="true">·</span>
                  <LiveSpectrumBadge isPlaying={activePlaying} />
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA]">{track.title}</h1>

            {/* Studio Master Waveform Visualization */}
            <div className="pt-4 pb-2 px-4 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#8E8E96] uppercase tracking-wider">
                <span>Master Audio Waveform</span>
                <span className="tabular-nums text-[#C8A464]">
                  {activePlaying ? 'Streaming Live' : isCurrent ? 'Paused' : track.duration || '0:00'}
                </span>
              </div>
              <div className="py-1 flex items-center">
                <AudioWaveform
                  trackId={track.id || track.slug || track.title}
                  isPlaying={activePlaying}
                  isLoading={isCurrent && isLoading}
                  currentTime={isCurrent ? currentTime : 0}
                  duration={isCurrent ? duration : 0}
                  onSeek={(sec) => {
                    if (isCurrent) {
                      seekTo(sec);
                    } else {
                      playTrack(track, [track, ...relatedTracks]);
                    }
                  }}
                  barCount={64}
                  heightClass="h-12"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1E1E24] flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => playTrack(track, [track, ...relatedTracks])}
              className="px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {activePlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Master Stream</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Master Stream</span>
                </>
              )}
            </button>

            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="px-5 py-3 rounded border border-[#2E2E38] text-[#F4F1EA] hover:border-[#C8A464] hover:text-[#C8A464] text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>Download MP3</span>
              </a>
            )}

            <div className="text-xs text-[#8E8E96] tabular-nums ml-auto">
              <span>{track.playCount || 0} plays</span>
              <span aria-hidden="true"> · </span>
              <span>{track.downloadCount || 0} downloads</span>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Official YouTube Video if enabled */}
      {track.youtubeVideoId && track.includeYoutubeVideo && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#F4F1EA]">Official Video Performance</h2>
          <div className="aspect-video max-w-4xl bg-black border border-[#222228] rounded-lg overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${track.youtubeVideoId}`}
              title={track.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Related Tracks */}
      {relatedTracks.length > 0 && (
        <section className="space-y-6 border-t border-[#222226] pt-12">
          <h2 className="text-2xl font-bold text-[#F4F1EA]">Related Recordings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {relatedTracks.slice(0, 4).map((item) => (
              <MusicCard key={item.id} track={item} queue={relatedTracks} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

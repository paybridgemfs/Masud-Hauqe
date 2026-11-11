'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Play,
  Pause,
  Download,
  Disc3,
  ArrowLeft,
  Clock,
  Calendar,
  Headphones,
  Share2,
  Check,
  Music2,
  Facebook,
  MessageCircle,
  Twitter,
  Copy,
  Sparkles,
} from 'lucide-react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import { getPublicDownloadUrl } from '@/lib/storage/audio-delivery.js';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';
import StoryCardModal from '@/components/music/StoryCardModal.jsx';
import MusicCard from './MusicCard.jsx';

function formatSeconds(secs) {
  if (!secs || Number.isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export default function MusicDetailClient({ track, relatedTracks = [], shareUrl: initialShareUrl = '' }) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playTrack,
    seekTo,
  } = usePlayer();
  const [copied, setCopied] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);

  const shareUrl = initialShareUrl || `/music/${track.slug}`;

  const isCurrent = currentTrack?.id === track.id;
  const activePlaying = isCurrent && isPlaying;
  const downloadUrl = getPublicDownloadUrl(track);

  const publishedDate = track.createdAt
    ? new Date(track.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Official Archive';

  const safeMaxDuration = isCurrent && duration > 0 ? duration : 100;
  const safeCurrentTime = isCurrent ? Math.min(currentTime, safeMaxDuration) : 0;

  const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;
  const whatsappShareHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${track.title} — ${shareUrl}`
  )}`;
  const twitterShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    track.title
  )}&url=${encodeURIComponent(shareUrl)}`;

  function handleCopyLink() {
    if (typeof window === 'undefined') return;
    const fullUrl = `${window.location.origin}/music/${track.slug}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/music"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#9A9AA2] hover:text-[#C8A464] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Music Library</span>
        </Link>
      </motion.div>

      {/* Primary Track Showcase */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch bg-[#111115] border border-[#222228] rounded-lg p-5 sm:p-8 lg:p-10 shadow-xl"
      >
        {/* Left: Artwork */}
        <div className="lg:col-span-4 flex">
          <div className="relative w-full aspect-square rounded-lg bg-[#16161C] border border-[#26262E] overflow-hidden flex items-center justify-center shadow-lg">
            {track.thumbnail ? (
              <ShimmerImage
                src={track.thumbnail}
                alt={track.title}
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
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

        {/* Right: Title, Studio Metadata Grid, Interactive Seek Bar, Social Share & Actions */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#C8A464] tracking-wider uppercase">
                <span>{track.artist?.name || 'Masud Hauqe'}</span>
                <span aria-hidden="true">·</span>
                <span>{track.album ? `Release: ${track.album.title}` : 'Official Single Master'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F4F1EA] leading-tight">
                {track.title}
              </h1>
            </div>

            {/* Studio Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Music2 className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>RELEASE</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] truncate">
                  {track.album ? (
                    <Link href={`/releases/${track.album.slug}`} className="hover:text-[#C8A464]">
                      {track.album.title}
                    </Link>
                  ) : (
                    'Single Track'
                  )}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Clock className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>DURATION</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums">
                  {track.duration || '0:00'} · MP3
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Calendar className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>PUBLISHED</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] truncate">
                  {publishedDate}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Headphones className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>ACTIVITY</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums truncate">
                  {track.playCount || 0} plays · {track.downloadCount || 0} DL
                </p>
              </div>
            </div>

            {/* Interactive On-Page Seek Bar Strip */}
            <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#D4D4D8]">
                  {activePlaying
                    ? 'Now Playing Master Audio'
                    : isCurrent
                      ? 'Playback Paused'
                      : 'Master Stream Timeline'}
                </span>
                <span className="text-[#8E8E96] tabular-nums">
                  {isCurrent ? formatSeconds(currentTime) : '0:00'} /{' '}
                  {isCurrent && duration > 0 ? formatSeconds(duration) : track.duration || '0:00'}
                </span>
              </div>

              <input
                type="range"
                aria-label="Track progress"
                min={0}
                max={safeMaxDuration}
                step={0.1}
                value={safeCurrentTime}
                onChange={(e) => {
                  const nextTime = Number(e.target.value);
                  if (isCurrent) {
                    seekTo(nextTime);
                  } else {
                    playTrack(track, [track, ...relatedTracks]);
                  }
                }}
                className="w-full h-1.5 bg-[#27272C] accent-[#C8A464] rounded-lg cursor-pointer"
              />
            </div>

            {/* Social Media Direct Share Bar (Facebook, WhatsApp, X/Twitter, Copy Link) */}
            <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#9A9AA2]">
                <Share2 className="w-3.5 h-3.5 text-[#C8A464] shrink-0" />
                <span className="font-semibold text-[#D4D4D8]">Share Track:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={facebookShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on Facebook"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#14141A] hover:bg-[#1877F2]/20 border border-[#26262F] hover:border-[#1877F2] text-xs font-medium text-[#E4E4E7] hover:text-white transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span>Facebook</span>
                </a>

                <a
                  href={whatsappShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on WhatsApp"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#14141A] hover:bg-[#25D366]/20 border border-[#26262F] hover:border-[#25D366] text-xs font-medium text-[#E4E4E7] hover:text-white transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={twitterShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on X (Twitter)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#14141A] hover:bg-white/10 border border-[#26262F] hover:border-[#A1A1AA] text-xs font-medium text-[#E4E4E7] hover:text-white transition-colors"
                >
                  <Twitter className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>X (Twitter)</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1D18] border border-[#26262F] hover:border-[#C8A464] text-xs font-medium text-[#E4E4E7] hover:text-[#C8A464] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      <span className="text-[#4ADE80]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#C8A464]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowStoryModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-[#C8A464]/20 via-[#D4B475]/15 to-[#C8A464]/20 hover:from-[#C8A464]/30 hover:to-[#D4B475]/30 border border-[#C8A464]/60 text-xs font-semibold text-[#F4F1EA] hover:text-white transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>Story Card (IG/FB)</span>
                </button>
              </div>
            </div>
          </div>

          <StoryCardModal
            isOpen={showStoryModal}
            onClose={() => setShowStoryModal(false)}
            track={track}
            artistName={track.artist?.name || 'Masud Hauqe'}
          />

          {/* Primary Actions Bar */}
          <div className="pt-4 border-t border-[#1E1E24] flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => playTrack(track, [track, ...relatedTracks])}
              className="px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shadow-md"
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
          </div>
        </div>
      </motion.section>

      {/* Embedded Official YouTube Video if enabled */}
      {track.youtubeVideoId && track.includeYoutubeVideo && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-bold text-[#F4F1EA]">Official Video Performance</h2>
          <div className="aspect-video max-w-4xl bg-black border border-[#222228] rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={`https://www.youtube.com/embed/${track.youtubeVideoId}`}
              title={track.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </motion.section>
      )}

      {/* Related Tracks */}
      {relatedTracks.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-6 border-t border-[#222226] pt-12"
        >
          <h2 className="text-2xl font-bold text-[#F4F1EA]">Related Recordings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {relatedTracks.slice(0, 4).map((item) => (
              <MusicCard key={item.id} track={item} queue={relatedTracks} />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}

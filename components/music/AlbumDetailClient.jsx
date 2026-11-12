'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Disc,
  ArrowLeft,
  Clock,
  Calendar,
  Music2,
  Headphones,
  Share2,
  Check,
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
import MiniEqualizerBars from '@/components/ui/MiniEqualizerBars.jsx';

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

function formatSeconds(secs) {
  if (!secs || Number.isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export default function AlbumDetailClient({ album, shareUrl: initialShareUrl = '' }) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playAlbum,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
  } = usePlayer();

  const [copied, setCopied] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const headerRef = useRef(null);
  const shareUrl = initialShareUrl || `/releases/${album.slug}`;

  // Ambient Cursor Spotlight & Cover Parallax Depth
  const mouseX = useMotionValue(420);
  const mouseY = useMotionValue(220);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 24 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 24 });
  const smoothNormX = useSpring(normX, { stiffness: 90, damping: 22 });
  const smoothNormY = useSpring(normY, { stiffness: 90, damping: 22 });

  const coverParallaxX = useTransform(smoothNormX, [-0.5, 0.5], [-10, 10]);
  const coverParallaxY = useTransform(smoothNormY, [-0.5, 0.5], [-10, 10]);
  const spotlightBg = useMotionTemplate`radial-gradient(560px circle at ${springX}px ${springY}px, rgba(200, 164, 100, 0.13), rgba(200, 164, 100, 0.03) 45%, transparent 75%)`;

  function handleHeaderMouseMove(e) {
    const rect = headerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX.set(x);
    mouseY.set(y);
    normX.set(x / Math.max(rect.width, 1) - 0.5);
    normY.set(y / Math.max(rect.height, 1) - 0.5);
  }

  function handleHeaderMouseLeave() {
    normX.set(0);
    normY.set(0);
  }

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

  // Check if any track from this release is currently active in the global player
  const activeReleaseTrackIndex = tracks.findIndex((t) => t.id === currentTrack?.id);
  const isReleaseActive = activeReleaseTrackIndex !== -1;
  const previewTrack = isReleaseActive ? currentTrack : tracks[0] || null;
  const previewTrackNumber = isReleaseActive ? activeReleaseTrackIndex + 1 : 1;

  const safeMaxDuration = isReleaseActive && duration > 0 ? duration : 100;
  const safeCurrentTime = isReleaseActive ? Math.min(currentTime, safeMaxDuration) : 0;

  const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}`;
  const whatsappShareHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `${album.title} — ${shareUrl}`
  )}`;
  const twitterShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    album.title
  )}&url=${encodeURIComponent(shareUrl)}`;

  function handleCopyLink() {
    if (typeof window === 'undefined') return;
    const fullUrl = `${window.location.origin}/releases/${album.slug}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  function handlePreviewPlayPause() {
    if (!tracks.length) return;
    if (isReleaseActive) {
      togglePlay();
    } else {
      playAlbum(tracks, 0);
    }
  }

  function handlePreviewPrev() {
    if (!tracks.length) return;
    if (isReleaseActive) {
      playPrevious();
    } else {
      playAlbum(tracks, 0);
    }
  }

  function handlePreviewNext() {
    if (!tracks.length) return;
    if (isReleaseActive) {
      playNext();
    } else {
      playAlbum(tracks, tracks.length > 1 ? 1 : 0);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/releases"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#9A9AA2] hover:text-[#C8A464] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Releases</span>
        </Link>
      </motion.div>

      {/* Release Header with Ambient Cursor Spotlight & Cover Parallax */}
      <motion.section
        ref={headerRef}
        onMouseMove={handleHeaderMouseMove}
        onMouseLeave={handleHeaderMouseLeave}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch bg-[#111115] border border-[#222228] rounded-lg p-5 sm:p-8 lg:p-10 shadow-xl"
      >
        {/* Subtle Ambient Golden Cursor Spotlight */}
        <motion.div
          style={{ background: spotlightBg }}
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        />

        <div className="relative z-10 lg:col-span-4 flex">
          <motion.div
            style={{ x: coverParallaxX, y: coverParallaxY }}
            className="relative w-full aspect-square rounded-lg bg-[#16161C] border border-[#26262E] overflow-hidden flex items-center justify-center shadow-2xl will-change-transform"
          >
            {album.coverImage ? (
              <ShimmerImage
                src={album.coverImage}
                alt={album.title}
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover scale-[1.03]"
              />
            ) : (
              <div className="text-center p-8">
                <Disc className="w-16 h-16 text-[#C8A464] mx-auto mb-3" />
                <span className="text-xs tracking-[0.2em] text-[#8E8E96]">OFFICIAL RELEASE</span>
              </div>
            )}
          </motion.div>
        </div>

        <div className="relative z-10 lg:col-span-8 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#C8A464] tracking-wider uppercase tabular-nums">
                {album.artist?.name && (
                  <>
                    <span>{album.artist.name}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>Studio Release</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F4F1EA] leading-tight">
                {album.title}
              </h1>

              {album.description && (
                <p className="text-sm sm:text-base text-[#D4D4D8] leading-relaxed whitespace-pre-line pt-1">
                  {album.description}
                </p>
              )}
            </motion.div>

            {/* Release Studio Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Music2 className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>RECORDINGS</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums">
                  {tracks.length} Master Tracks
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Clock className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>RUNTIME</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums">
                  {totalRuntime}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Calendar className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>RELEASE DATE</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] truncate">
                  {releaseDateStr}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E96]">
                  <Headphones className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>TOTAL STREAMS</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#F4F1EA] tabular-nums">
                  {totalPlays} Plays
                </p>
              </div>
            </div>

            {/* Now Playing Track Preview Box (Track Title, Progress Bar & Next/Previous Controls) */}
            {previewTrack && (
              <div className="p-4 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase text-[#C8A464]">
                      <span>
                        {isReleaseActive && isPlaying
                          ? 'Now Playing from Release'
                          : isReleaseActive
                            ? 'Paused in Release'
                            : 'Release Stream Preview'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        Track {String(previewTrackNumber).padStart(2, '0')} of{' '}
                        {String(tracks.length).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-[#F4F1EA] truncate mt-0.5">
                      {previewTrack.title}
                    </p>
                  </div>

                  {/* Next / Play-Pause / Previous Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handlePreviewPrev}
                      aria-label="Previous release track"
                      className="p-2 rounded bg-[#14141A] border border-[#26262F] text-[#D4D4D8] hover:text-[#C8A464] hover:border-[#C8A464] transition-colors"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handlePreviewPlayPause}
                      disabled={isReleaseActive && isLoading}
                      aria-label={isReleaseActive && isPlaying ? 'Pause' : 'Play'}
                      className="w-9 h-9 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center transition-transform hover:scale-105 shadow"
                    >
                      {isReleaseActive && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handlePreviewNext}
                      aria-label="Next release track"
                      className="p-2 rounded bg-[#14141A] border border-[#26262F] text-[#D4D4D8] hover:text-[#C8A464] hover:border-[#C8A464] transition-colors"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Timestamps */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#8E8E96] tabular-nums w-9 text-right shrink-0">
                    {isReleaseActive ? formatSeconds(currentTime) : '0:00'}
                  </span>
                  <input
                    type="range"
                    aria-label="Release track progress"
                    min={0}
                    max={safeMaxDuration}
                    step={0.1}
                    value={safeCurrentTime}
                    onChange={(e) => {
                      const nextTime = Number(e.target.value);
                      if (isReleaseActive) {
                        seekTo(nextTime);
                      } else {
                        playAlbum(tracks, 0);
                      }
                    }}
                    className="w-full h-1.5 bg-[#27272C] accent-[#C8A464] rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] text-[#8E8E96] tabular-nums w-9 shrink-0">
                    {isReleaseActive && duration > 0
                      ? formatSeconds(duration)
                      : previewTrack.duration || '0:00'}
                  </span>
                </div>
              </div>
            )}

            {/* Social Media Direct Share Bar (Facebook, WhatsApp, X/Twitter, Copy Link) */}
            <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#9A9AA2]">
                <Share2 className="w-3.5 h-3.5 text-[#C8A464] shrink-0" />
                <span className="font-semibold text-[#D4D4D8]">Share Release:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={facebookShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share release on Facebook"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#14141A] hover:bg-[#1877F2]/20 border border-[#26262F] hover:border-[#1877F2] text-xs font-medium text-[#E4E4E7] hover:text-white transition-colors"
                >
                  <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span>Facebook</span>
                </a>

                <a
                  href={whatsappShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share release on WhatsApp"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#14141A] hover:bg-[#25D366]/20 border border-[#26262F] hover:border-[#25D366] text-xs font-medium text-[#E4E4E7] hover:text-white transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={twitterShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share release on X (Twitter)"
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

            <StoryCardModal
              isOpen={showStoryModal}
              onClose={() => setShowStoryModal(false)}
              album={album}
              artistName={album.artist?.name || ''}
              shareUrl={shareUrl}
            />
          </div>

          {tracks.length > 0 && (
            <div className="pt-4 border-t border-[#1E1E24]">
              <button
                type="button"
                onClick={() => playAlbum(tracks, 0)}
                className="px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Complete Release</span>
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Release Tracklist */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-bold text-[#F4F1EA]">Release Tracklist</h2>

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
                    <span className="text-xs text-[#8E8E96] tabular-nums w-6 flex items-center justify-center">
                      {active ? (
                        <MiniEqualizerBars isPlaying={activePlaying} size="sm" />
                      ) : (
                        String(idx + 1).padStart(2, '0')
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => playTrack(track, tracks)}
                      aria-label={activePlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 shrink-0 ${
                        active
                          ? 'bg-[#C8A464] text-[#09090B]'
                          : 'bg-[#1E1E24] hover:bg-[#C8A464] text-[#F4F1EA] hover:text-[#09090B]'
                      }`}
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
                        className={`text-sm sm:text-base font-semibold truncate block transition-colors ${
                          active ? 'text-[#C8A464]' : 'text-[#F4F1EA] hover:text-[#C8A464]'
                        }`}
                      >
                        {track.title}
                      </Link>
                      {album.artist?.name && (
                        <p className="text-xs text-[#8E8E96] truncate">
                          {album.artist.name}
                        </p>
                      )}
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
              No published tracks are assigned to this release yet. Assign tracks in the Admin Music Manager.
            </p>
          </div>
        )}
      </motion.section>
    </div>
  );
}

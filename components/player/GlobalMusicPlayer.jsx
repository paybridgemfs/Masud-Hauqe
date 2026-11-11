'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Download,
  AlertCircle,
  X,
  Disc3,
} from 'lucide-react';
import { usePlayer } from './PlayerContext.jsx';
import { getPublicDownloadUrl } from '@/lib/storage/audio-delivery.js';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';

function formatSeconds(secs) {
  if (!secs || Number.isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

export default function GlobalMusicPlayer() {
  const {
    playlist,
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    error,
    isPlaylistOpen,
    setIsPlaylistOpen,
    setShuffle,
    cycleRepeatMode,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    setVolume,
    toggleMute,
    playTrack,
    closePlayer,
    clearError,
  } = usePlayer();

  useEffect(() => {
    function handleKeyDown(e) {
      if (!currentTrack) return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekTo(currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekTo(currentTime - 5);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTrack, currentTime, seekTo, togglePlay]);

  if (!currentTrack) {
    return null;
  }

  const downloadUrl = getPublicDownloadUrl(currentTrack);
  const safeMaxDuration = duration > 0 ? duration : 100;
  const safeCurrentTime = Math.min(currentTime, safeMaxDuration);
  const formattedTotalDuration =
    duration > 0 ? formatSeconds(duration) : currentTrack.duration || '0:00';

  return (
    <>
      {/* Playback Queue Drawer (Responsive for Mobile & Desktop) */}
      <AnimatePresence>
        {isPlaylistOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            aria-label="Current playback queue"
            className="fixed bottom-28 md:bottom-24 inset-x-3 md:left-auto md:right-6 z-50 md:w-80 bg-[#111114] border border-[#26262B] rounded-lg shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#222226]">
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-[#F4F1EA]">
                Playback Queue · <span className="tabular-nums">{playlist.length}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsPlaylistOpen(false)}
                aria-label="Close playback queue"
                className="p-1 text-[#A1A1AA] hover:text-[#F4F1EA] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-[#1E1E22]">
              {playlist.map((item) => {
                const active = item.id === currentTrack.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => playTrack(item)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      active ? 'bg-[#1C1B18] text-[#C8A464]' : 'hover:bg-[#18181C] text-[#F4F1EA]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-[#8E8E96] truncate">
                        {item.artist?.name || 'Masud Hauqe'}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#8E8E96] tabular-nums shrink-0">
                      {item.duration || '0:00'}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Error Toast above player if audio stream fails */}
      {error && (
        <div
          role="alert"
          className="fixed bottom-28 md:bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100vw-1.5rem)] bg-[#2A1215] border border-[#7F1D1D] text-[#FECACA] px-3.5 py-2.5 rounded-lg flex items-center justify-between gap-3 shadow-xl"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
            <span className="line-clamp-2">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss playback error"
            className="p-1 text-[#FCA5A5] hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Persistent Player Container */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        role="region"
        aria-label="Global music player"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#0D0D10]/95 backdrop-blur-md border-t border-[#222226]"
      >
        {/* ============================================================
            DESKTOP VERSION (md and up)
        ============================================================ */}
        <div className="hidden md:block px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            {/* Left: Track Identity */}
            <div className="flex items-center gap-3.5 min-w-0 w-[28%]">
              <div className="relative w-12 h-12 rounded-md bg-[#18181C] border border-[#27272C] overflow-hidden shrink-0 flex items-center justify-center">
                {currentTrack.thumbnail ? (
                  <ShimmerImage
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <Disc3 className="w-5 h-5 text-[#C8A464]" />
                )}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/music/${currentTrack.slug}`}
                  className="block text-sm font-semibold text-[#F4F1EA] hover:text-[#C8A464] truncate transition-colors"
                >
                  {currentTrack.title}
                </Link>
                <p className="text-xs text-[#9A9AA2] truncate mt-0.5">
                  {currentTrack.artist?.name || 'Masud Hauqe'}
                  {currentTrack.album?.title ? ` · ${currentTrack.album.title}` : ''}
                </p>
              </div>
            </div>

            {/* Center: Transport Controls + Classic Seek Bar */}
            <div className="flex flex-col items-center flex-1 max-w-xl">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setShuffle(!shuffle)}
                  aria-label="Toggle shuffle"
                  className={`p-1.5 rounded transition-colors ${
                    shuffle ? 'text-[#C8A464]' : 'text-[#8E8E96] hover:text-[#F4F1EA]'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={playPrevious}
                  aria-label="Previous track"
                  className="p-1.5 text-[#D4D4D8] hover:text-[#F4F1EA] transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  disabled={isLoading}
                  className="w-9 h-9 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center transition-colors disabled:opacity-50 shadow-md"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={playNext}
                  aria-label="Next track"
                  className="p-1.5 text-[#D4D4D8] hover:text-[#F4F1EA] transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeatMode}
                  aria-label={`Repeat mode: ${repeatMode}`}
                  className={`p-1.5 rounded transition-colors ${
                    repeatMode !== 'off' ? 'text-[#C8A464]' : 'text-[#8E8E96] hover:text-[#F4F1EA]'
                  }`}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="w-full flex items-center gap-3 mt-1.5">
                <span className="text-[11px] text-[#8E8E96] tabular-nums w-9 text-right shrink-0">
                  {formatSeconds(currentTime)}
                </span>
                <input
                  type="range"
                  aria-label="Seek timeline"
                  min={0}
                  max={safeMaxDuration}
                  step={0.1}
                  value={safeCurrentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#27272C] accent-[#C8A464] rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-[#8E8E96] tabular-nums w-9 shrink-0">
                  {formattedTotalDuration}
                </span>
              </div>
            </div>

            {/* Right: Volume, Download, Queue & Close */}
            <div className="flex items-center justify-end gap-2.5 w-[28%]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1.5 text-[#A1A1AA] hover:text-[#F4F1EA] transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="Volume"
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-24 h-1.5 bg-[#27272C] accent-[#C8A464] rounded-lg cursor-pointer"
                />
              </div>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  aria-label={`Download ${currentTrack.title} MP3`}
                  className="p-2 text-[#A1A1AA] hover:text-[#C8A464] transition-colors"
                  title="Download Authorized MP3"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                aria-label="Toggle playback queue"
                title="Playback Queue"
                className={`p-2 rounded transition-colors ${
                  isPlaylistOpen
                    ? 'text-[#C8A464] bg-[#1C1B18]'
                    : 'text-[#A1A1AA] hover:text-[#F4F1EA]'
                }`}
              >
                <ListMusic className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={closePlayer}
                aria-label="Close music player"
                title="Close Player"
                className="p-2 rounded text-[#A1A1AA] hover:text-[#F87171] hover:bg-[#1E1416] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            MOBILE VERSION (Below md: < 768px)
        ============================================================ */}
        <div className="md:hidden px-3 pt-2 pb-2.5 space-y-1.5">
          {/* Row 1: Full-Width Touch Seek Bar + Timestamps */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8E8E96] tabular-nums w-7 text-right shrink-0">
              {formatSeconds(currentTime)}
            </span>
            <input
              type="range"
              aria-label="Seek timeline"
              min={0}
              max={safeMaxDuration}
              step={0.1}
              value={safeCurrentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="w-full h-1.5 bg-[#27272C] accent-[#C8A464] rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-[#8E8E96] tabular-nums w-7 shrink-0">
              {formattedTotalDuration}
            </span>
          </div>

          {/* Row 2: Compact Track Info + Transport & Utility Buttons */}
          <div className="flex items-center justify-between gap-2">
            {/* Track Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative w-10 h-10 rounded bg-[#18181C] border border-[#27272C] overflow-hidden shrink-0 flex items-center justify-center">
                {currentTrack.thumbnail ? (
                  <ShimmerImage
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <Disc3 className="w-4 h-4 text-[#C8A464]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/music/${currentTrack.slug}`}
                  className="block text-xs font-semibold text-[#F4F1EA] hover:text-[#C8A464] truncate transition-colors"
                >
                  {currentTrack.title}
                </Link>
                <p className="text-[10px] text-[#9A9AA2] truncate">
                  {currentTrack.artist?.name || 'Masud Hauqe'}
                </p>
              </div>
            </div>

            {/* Mobile Controls */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={playPrevious}
                aria-label="Previous track"
                className="p-1.5 text-[#D4D4D8] active:text-[#C8A464] transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                disabled={isLoading}
                className="w-8 h-8 mx-0.5 rounded-full bg-[#C8A464] text-[#09090B] flex items-center justify-center transition-colors disabled:opacity-50 shadow"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={playNext}
                aria-label="Next track"
                className="p-1.5 text-[#D4D4D8] active:text-[#C8A464] transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  aria-label={`Download ${currentTrack.title} MP3`}
                  className="p-1.5 text-[#A1A1AA] hover:text-[#C8A464] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                type="button"
                onClick={() => setIsPlaylistOpen(!isPlaylistOpen)}
                aria-label="Toggle playback queue"
                className={`p-1.5 rounded transition-colors ${
                  isPlaylistOpen ? 'text-[#C8A464] bg-[#1C1B18]' : 'text-[#A1A1AA]'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={closePlayer}
                aria-label="Close music player"
                className="p-1.5 rounded text-[#A1A1AA] hover:text-[#F87171] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

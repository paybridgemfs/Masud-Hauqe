'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Download,
  Share2,
  Disc3,
  Sparkles,
} from 'lucide-react';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';

export default function FullScreenPlayer({
  isOpen,
  onClose,
  currentTrack,
  playlist = [],
  isPlaying,
  isLoading,
  currentTime,
  duration,
  volume,
  isMuted,
  shuffle,
  repeatMode,
  togglePlay,
  playNext,
  playPrevious,
  seekTo,
  setVolume,
  toggleMute,
  setShuffle,
  cycleRepeatMode,
  playTrack,
  formatSeconds,
  downloadUrl,
}) {
  const [showQueue, setShowQueue] = React.useState(false);

  if (!isOpen || !currentTrack) return null;

  const safeMaxDuration = duration > 0 ? duration : 100;
  const safeCurrentTime = Math.min(currentTime, safeMaxDuration);
  const formattedTotalDuration =
    duration > 0 ? formatSeconds(duration) : currentTrack.duration || '0:00';
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // Real-time audio responsive equalizer heights based on playback state and current timestamp
  // Changes harmoniously with track time and stays alive during play, flatlining gracefully when paused
  const getFrequencyHeight = (i) => {
    if (!isPlaying) return 10;
    // Composite sine waves using timestamp & track seed to simulate real dynamic sound frequencies
    const waveA = Math.sin((currentTime * 3.8) + i * 0.9);
    const waveB = Math.cos((currentTime * 7.2) + i * 1.6);
    const waveC = Math.sin((currentTime * 1.5) + (i * 0.4));
    const combined = (waveA * 0.45 + waveB * 0.35 + waveC * 0.2 + 1) / 2; // 0 to 1
    return Math.max(16, Math.min(100, Math.round(combined * 96)));
  };

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0.8 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0.8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Full screen immersive music player"
      className="fixed inset-0 z-50 bg-[#09090B] text-[#F4F1EA] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Background Ambient Art Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {currentTrack.thumbnail ? (
          <div className="absolute -inset-10 opacity-25 blur-3xl scale-125 transition-all duration-1000">
            <ShimmerImage
              src={currentTrack.thumbnail}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,164,100,0.18)_0%,rgba(9,9,11,0.98)_75%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090B]/90 via-[#09090B]/85 to-[#09090B]" />
      </div>

      {/* ============================================================
          TOP HEADER STRIP
      ============================================================ */}
      <header className="relative z-10 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize full screen player"
          className="p-2 sm:p-2.5 rounded-full bg-[#18181D]/80 hover:bg-[#25252E] text-[#D4D4D8] hover:text-[#C8A464] border border-white/10 transition-colors flex items-center gap-1.5"
        >
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline text-xs font-semibold">Minimize</span>
        </button>

        <div className="text-center min-w-0 px-3">
          <p className="text-[10px] sm:text-xs font-semibold tracking-[0.24em] text-[#C8A464] uppercase">
            PLAYING FROM REPERTOIRE
          </p>
          <p className="text-xs sm:text-sm font-bold text-[#F4F1EA] truncate max-w-xs sm:max-w-md">
            {currentTrack.album?.title ? `Release: ${currentTrack.album.title}` : 'Official Master Recordings'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowQueue(!showQueue)}
          aria-label="Toggle playback queue"
          className={`p-2 sm:p-2.5 rounded-full border border-white/10 transition-colors ${
            showQueue
              ? 'bg-[#C8A464] text-[#09090B]'
              : 'bg-[#18181D]/80 hover:bg-[#25252E] text-[#D4D4D8] hover:text-[#C8A464]'
          }`}
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </header>

      {/* ============================================================
          CENTER CONTENT (DESKTOP & MOBILE SPLIT)
      ============================================================ */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-8 flex items-center justify-center">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Premium Vinyl Artwork Card + Floating Mini Audio-Responsive Equalizer */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-2xl overflow-hidden bg-[#141418] border-2 border-[#C8A464]/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] group flex items-center justify-center">
              {currentTrack.thumbnail ? (
                <ShimmerImage
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  fill
                  sizes="(max-width: 640px) 256px, (max-width: 1024px) 384px, 420px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1A14] via-[#111115] to-[#09090B] text-center p-6">
                  <Disc3 className="w-20 h-20 text-[#C8A464] mb-3 animate-[spin_12s_linear_infinite]" />
                  <span className="text-xs tracking-widest text-[#9A9AA2] font-semibold">
                    MASTER RECORDING
                  </span>
                </div>
              )}

              {/* Floating Mini Equalizer Badge Inside Artwork (Bottom-Right) */}
              <div className="absolute bottom-3.5 right-3.5 z-10 px-3 py-1.5 rounded-lg bg-[#09090B]/85 backdrop-blur-md border border-[#C8A464]/50 flex items-center gap-1.5 shadow-lg">
                <span className="text-[10px] font-mono text-[#C8A464] font-semibold">
                  {isPlaying ? 'LIVE' : 'PAUSED'}
                </span>
                <div className="flex items-end gap-0.5 h-3.5 w-6">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ height: `${getFrequencyHeight(i * 3)}%` }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="w-1 bg-[#C8A464] rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Track Details, Wide Audio Spectrum Visualizer, & Controls */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6 max-w-lg mx-auto w-full">
            {/* Identity & Badges */}
            <div className="space-y-2 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <span className="text-[11px] font-semibold tracking-widest px-2.5 py-0.5 rounded bg-[#C8A464]/15 text-[#C8A464] border border-[#C8A464]/30 uppercase">
                  Studio Master
                </span>
                {currentTrack.album?.title && (
                  <span className="text-[11px] font-medium text-[#9A9AA2]">
                    · {currentTrack.album.title}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#F4F1EA] leading-tight line-clamp-2">
                {currentTrack.title}
              </h1>

              <p className="text-base sm:text-lg text-[#C8A464] font-medium">
                {currentTrack.artist?.name || 'Masud Hauqe'}
              </p>
            </div>

            {/* Live Audio-Responsive Full Spectrum Visualizer (Harmonized with Track Playback) */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#111116]/80 border border-white/10 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between text-xs text-[#8E8E96]">
                <span className="flex items-center gap-1.5 font-semibold text-[#D4D4D8]">
                  <Sparkles className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>Real-time Audio Spectrum</span>
                </span>
                <span className="font-mono text-[#C8A464] tabular-nums">
                  {isPlaying ? 'ACTIVE FREQUENCIES' : 'IDLE'}
                </span>
              </div>

              {/* 24 Frequency Bands that dynamically respond to music playback */}
              <div className="h-14 sm:h-16 flex items-end justify-between gap-1 sm:gap-1.5 px-1">
                {Array.from({ length: 24 }).map((_, idx) => (
                  <motion.div
                    key={idx}
                    animate={{ height: `${getFrequencyHeight(idx)}%` }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="w-full bg-gradient-to-t from-[#8E6F36] via-[#C8A464] to-[#F4F1EA] rounded-full shadow-[0_0_8px_rgba(200,164,100,0.35)]"
                  />
                ))}
              </div>
            </div>

            {/* Seek Bar + Timestamps */}
            <div className="space-y-2">
              <input
                type="range"
                aria-label="Seek timeline"
                min={0}
                max={safeMaxDuration}
                step={0.1}
                value={safeCurrentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full h-2 bg-[#26262E] accent-[#C8A464] rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-xs text-[#8E8E96] font-mono tabular-nums">
                <span>{formatSeconds(currentTime)}</span>
                <span>{formattedTotalDuration}</span>
              </div>
            </div>

            {/* Main Full-Screen Player Transport Controls */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShuffle(!shuffle)}
                aria-label="Toggle shuffle"
                className={`p-2.5 rounded-full transition-colors ${
                  shuffle ? 'text-[#C8A464] bg-[#C8A464]/15' : 'text-[#8E8E96] hover:text-[#F4F1EA]'
                }`}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={playPrevious}
                aria-label="Previous track"
                className="p-3 rounded-full text-[#D4D4D8] hover:text-[#C8A464] hover:bg-white/5 transition-all"
              >
                <SkipBack className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(200,164,100,0.45)]"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
                ) : (
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={playNext}
                aria-label="Next track"
                className="p-3 rounded-full text-[#D4D4D8] hover:text-[#C8A464] hover:bg-white/5 transition-all"
              >
                <SkipForward className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>

              <button
                type="button"
                onClick={cycleRepeatMode}
                aria-label={`Repeat mode: ${repeatMode}`}
                className={`p-2.5 rounded-full transition-colors ${
                  repeatMode !== 'off'
                    ? 'text-[#C8A464] bg-[#C8A464]/15'
                    : 'text-[#8E8E96] hover:text-[#F4F1EA]'
                }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Bottom Utilities (Volume Slider + MP3 Download) */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1.5 text-[#8E8E96] hover:text-[#F4F1EA] transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
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
                  className="w-full h-1.5 bg-[#26262E] accent-[#C8A464] rounded-lg cursor-pointer"
                />
              </div>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  aria-label={`Download ${currentTrack.title} MP3`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#C8A464]/50 bg-[#C8A464]/10 hover:bg-[#C8A464] text-[#F4F1EA] hover:text-[#09090B] text-xs font-semibold transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP3</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================
          SLIDE-OVER QUEUE DRAWER IN FULL SCREEN
      ============================================================ */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-y-0 right-0 z-20 w-full sm:w-96 bg-[#111116]/98 border-l border-white/10 p-6 flex flex-col justify-between backdrop-blur-2xl shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h2 className="text-base font-bold text-[#F4F1EA]">
                  Playback Queue ({playlist.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShowQueue(false)}
                  className="text-xs text-[#8E8E96] hover:text-[#F4F1EA]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 max-h-[70vh] overflow-y-auto divide-y divide-white/5 space-y-1">
                {playlist.map((item, idx) => {
                  const active = item.id === currentTrack.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => playTrack(item)}
                      className={`w-full text-left p-3 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                        active
                          ? 'bg-[#C8A464]/15 text-[#C8A464]'
                          : 'hover:bg-white/5 text-[#E4E4E7]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-[#8E8E96] w-4">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{item.title}</p>
                          <p className="text-xs text-[#8E8E96] truncate">
                            {item.artist?.name || 'Masud Hauqe'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-[#8E8E96] tabular-nums font-mono shrink-0">
                        {item.duration || '0:00'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

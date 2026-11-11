'use client';

import React, { useState } from 'react';
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
  Disc3,
  Activity,
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
  audioMetrics = {},
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
  const [showQueue, setShowQueue] = useState(false);
  const [slideDirection, setSlideDirection] = useState(0); // 1 = slide from right (next), -1 = slide from left (prev)

  if (!isOpen || !currentTrack) return null;

  const safeMaxDuration = duration > 0 ? duration : 100;
  const safeCurrentTime = Math.min(currentTime, safeMaxDuration);
  const formattedTotalDuration =
    duration > 0 ? formatSeconds(duration) : currentTrack.duration || '0:00';

  // Extract real audio reactive parameters
  const freqData = audioMetrics?.frequencyData;
  const isBeat = Boolean(audioMetrics?.beat);
  const stereoWidth = audioMetrics?.stereoWidth || 0.6;
  const spectralEnergy = audioMetrics?.spectralEnergy || 0;

  // Real-time audio responsive bar height calculation (Dynamic 32 Dancing Bands across full frequency)
  const getBandHeight = (bandIdx, totalBands = 32) => {
    if (!isPlaying) return 6;

    // Check if we have real Web Audio API byte data
    if (freqData && freqData.length > 0) {
      const byteIdx = Math.floor((bandIdx / totalBands) * (freqData.length - 1));
      const rawByte = freqData[byteIdx] || 0;
      if (rawByte > 0) {
        // Natural log-style frequency mapping (prevents bass pinning at 100%)
        const normalized = Math.min(100, Math.round((rawByte / 255) * 88));
        return Math.max(8, normalized);
      }
    }

    // Dynamic wave physical synthesis without static pinning on the first 8 bars
    const t = currentTime;
    const bandFreqRatio = (bandIdx + 1) / totalBands;
    const fundamental = Math.sin(t * 7.5 + bandIdx * 0.6);
    const harmonic = Math.cos(t * 14.8 + bandIdx * 1.1) * 0.45;
    const beatPulse = isBeat ? (Math.sin(bandIdx * 0.5) * 25) : 0;
    const stereoMod = Math.sin(bandIdx * stereoWidth + t * 2) * 8;
    const dynamicBass = bandIdx < 8 ? Math.abs(Math.sin(t * 5.2 + bandIdx * 0.4)) * 45 : 0;

    const baseVal = Math.max(
      8,
      Math.min(
        100,
        Math.round(
          14 +
            (fundamental * 22 + harmonic * 15) +
            dynamicBass +
            beatPulse +
            stereoMod +
            spectralEnergy * 10
        )
      )
    );
    return baseVal;
  };

  function handleSwipeNext() {
    setSlideDirection(1);
    playNext();
  }

  function handleSwipePrev() {
    setSlideDirection(-1);
    playPrevious();
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="Full screen immersive music player"
      className="fixed inset-0 z-50 h-[100dvh] max-h-[100dvh] w-screen bg-[#070709] text-[#F4F1EA] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* ============================================================
          FULL-SCREEN BLURRED THUMBNAIL BACKGROUND (DYNAMIC & VIBRANT)
      ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {currentTrack.thumbnail ? (
          <div className="absolute -inset-16 scale-125 filter blur-3xl opacity-35 transition-all duration-700 ease-out">
            <ShimmerImage
              src={currentTrack.thumbnail}
              alt=""
              fill
              priority
              className="object-cover object-center"
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(200,164,100,0.25)_0%,rgba(7,7,9,0.98)_75%)]" />
        )}
        {/* Soft Vignette & Deep Obsidian Gradient Overlays for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/75 to-[#070709]/85" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* ============================================================
          TOP HEADER STRIP
      ============================================================ */}
      <header className="relative z-10 shrink-0 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-white/[0.08]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize full screen player"
          className="p-1.5 sm:p-2 rounded-full bg-[#141418]/80 hover:bg-[#222228] text-[#D4D4D8] hover:text-[#C8A464] border border-white/10 transition-colors flex items-center gap-1.5"
        >
          <ChevronDown className="w-5 h-5 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline text-xs font-semibold">Minimize</span>
        </button>

        {/* Center Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121217]/90 border border-[#C8A464]/30 text-[10px] sm:text-xs font-mono font-semibold text-[#C8A464]">
            <Activity className="w-3.5 h-3.5 text-[#C8A464]" />
            <span>{isPlaying ? 'AUDIO SPECTRUM REACTIVE' : 'SPECTRUM IDLE'}</span>
            {isBeat && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-ping ml-0.5" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowQueue(!showQueue)}
          aria-label="Toggle playback queue"
          className={`p-1.5 sm:p-2 rounded-full border border-white/10 transition-colors ${
            showQueue
              ? 'bg-[#C8A464] text-[#09090B]'
              : 'bg-[#141418]/80 hover:bg-[#222228] text-[#D4D4D8] hover:text-[#C8A464]'
          }`}
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </header>

      {/* ============================================================
          MAIN BODY (FITS 100vh / 100dvh STRICTLY WITH NO SCROLLBAR)
          Desktop: Split-View (Thumbnail LEFT, Controls & Tall Visualizer RIGHT)
          Mobile: Vertical Balanced Stack (Swipeable Thumbnail + Tall Visualizer + Controls)
      ============================================================ */}
      <main className="relative z-10 flex-1 min-h-0 px-4 sm:px-8 py-2 sm:py-4 flex items-center justify-center overflow-hidden">
        <div className="max-w-5xl w-full h-full flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-4 lg:gap-12 py-1">
          {/* ============================================================
              THUMBNAIL (LEFT ON DESKTOP, CENTER ON MOBILE)
              Includes smooth drag/swipe gesture: Swipe left -> Next, Swipe right -> Prev
          ============================================================ */}
          <div className="shrink-0 flex items-center justify-center my-auto lg:my-0">
            <div className="relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentTrack.id}
                  initial={{
                    opacity: 0,
                    x: slideDirection > 0 ? 60 : slideDirection < 0 ? -60 : 0,
                    scale: 0.96,
                  }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    x: slideDirection > 0 ? -60 : 60,
                    scale: 0.96,
                  }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x;
                    if (swipe < -60 || velocity.x < -400) {
                      handleSwipeNext();
                    } else if (swipe > 60 || velocity.x > 400) {
                      handleSwipePrev();
                    }
                  }}
                  className="relative aspect-square h-[28vh] sm:h-[36vh] lg:h-[46vh] max-h-[400px] rounded-2xl overflow-hidden bg-[#121217] border border-[#C8A464]/40 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
                >
                  {currentTrack.thumbnail ? (
                    <ShimmerImage
                      src={currentTrack.thumbnail}
                      alt={currentTrack.title}
                      fill
                      sizes="(max-width: 1024px) 340px, 420px"
                      className="object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1A14] via-[#111115] to-[#09090B] text-center p-4">
                      <Disc3 className="w-16 h-16 text-[#C8A464] mb-2 animate-[spin_10s_linear_infinite]" />
                      <span className="text-[10px] tracking-widest text-[#9A9AA2] font-semibold">
                        MASTER TRACK
                      </span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Subtle Swipe Guidance Hint on Mobile */}
              <div className="lg:hidden text-center mt-1">
                <span className="text-[9px] text-[#8E8E96] tracking-wider uppercase">
                  ← Swipe to change track →
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================
              RIGHT ON DESKTOP / BOTTOM ON MOBILE:
              Title, Subtitle, Tall Audio-Reactive Visualizer & Controls
          ============================================================ */}
          <div className="flex-1 min-w-0 w-full max-w-xl flex flex-col justify-center space-y-3 sm:space-y-4">
            {/* Track Info */}
            <div className="text-center lg:text-left space-y-0.5 sm:space-y-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#F4F1EA] truncate">
                {currentTrack.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#C8A464] font-medium truncate">
                {currentTrack.artist?.name || 'Masud Hauqe'}
                {currentTrack.album?.title ? ` · ${currentTrack.album.title}` : ''}
              </p>
            </div>

            {/* ============================================================
                TALL AUDIO-REACTIVE SPECTRUM VISUALIZER (ENHANCED HEIGHT)
                32 Dynamic Dancing Bars that react to beat, volume & frequency
            ============================================================ */}
            <div className="h-16 sm:h-24 lg:h-28 px-3 py-2 rounded-xl bg-[#0C0C12]/80 border border-white/10 backdrop-blur-md flex items-end justify-between gap-1 shadow-inner overflow-hidden">
              {Array.from({ length: 32 }).map((_, idx) => {
                const heightPercent = getBandHeight(idx, 32);
                const isBass = idx < 8;
                return (
                  <motion.div
                    key={idx}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.08, ease: 'easeOut' }}
                    className={`w-full rounded-full transition-all ${
                      isBass
                        ? 'bg-gradient-to-t from-[#B45309] via-[#C8A464] to-[#FDE047] shadow-[0_0_8px_rgba(200,164,100,0.5)]'
                        : 'bg-gradient-to-t from-[#8E6F36] via-[#C8A464] to-[#F4F1EA]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Seek Slider + Timestamps */}
            <div className="space-y-1">
              <input
                type="range"
                aria-label="Seek timeline"
                min={0}
                max={safeMaxDuration}
                step={0.1}
                value={safeCurrentTime}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full h-1.5 bg-[#222228] accent-[#C8A464] rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-[#8E8E96] font-mono tabular-nums">
                <span>{formatSeconds(currentTime)}</span>
                <span>{formattedTotalDuration}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setShuffle(!shuffle)}
                aria-label="Toggle shuffle"
                className={`p-2 rounded-full transition-colors ${
                  shuffle ? 'text-[#C8A464] bg-[#C8A464]/15' : 'text-[#8E8E96] hover:text-[#F4F1EA]'
                }`}
              >
                <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={handleSwipePrev}
                aria-label="Previous track"
                className="p-2 sm:p-2.5 rounded-full text-[#D4D4D8] hover:text-[#C8A464] transition-colors"
              >
                <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(200,164,100,0.5)] shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSwipeNext}
                aria-label="Next track"
                className="p-2 sm:p-2.5 rounded-full text-[#D4D4D8] hover:text-[#C8A464] transition-colors"
              >
                <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                type="button"
                onClick={cycleRepeatMode}
                aria-label={`Repeat mode: ${repeatMode}`}
                className={`p-2 rounded-full transition-colors ${
                  repeatMode !== 'off'
                    ? 'text-[#C8A464] bg-[#C8A464]/15'
                    : 'text-[#8E8E96] hover:text-[#F4F1EA]'
                }`}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>

            {/* Bottom Utilities (Volume Slider on Desktop, MP3 Download Button) */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[220px]">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1 text-[#8E8E96] hover:text-[#F4F1EA]"
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
                  className="w-full h-1.5 bg-[#26262E] accent-[#C8A464] rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end w-full sm:w-auto">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    aria-label={`Download ${currentTrack.title} MP3`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#C8A464]/15 hover:bg-[#C8A464] border border-[#C8A464]/40 text-[#F4F1EA] hover:text-[#09090B] text-xs font-semibold transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MP3</span>
                  </a>
                )}
              </div>
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
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-y-0 right-0 z-30 w-full sm:w-96 bg-[#0E0E14]/98 border-l border-white/10 p-5 flex flex-col justify-between backdrop-blur-2xl shadow-2xl"
          >
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                <h2 className="text-sm font-bold text-[#F4F1EA]">
                  Playback Queue ({playlist.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setShowQueue(false)}
                  className="text-xs text-[#8E8E96] hover:text-[#F4F1EA] p-1"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 flex-1 overflow-y-auto divide-y divide-white/5 space-y-1 pr-1">
                {playlist.map((item, idx) => {
                  const active = item.id === currentTrack.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => playTrack(item)}
                      className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-2.5 transition-colors ${
                        active
                          ? 'bg-[#C8A464]/15 text-[#C8A464]'
                          : 'hover:bg-white/5 text-[#E4E4E7]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono text-[#8E8E96] w-4">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{item.title}</p>
                          <p className="text-[10px] text-[#8E8E96] truncate">
                            {item.artist?.name || 'Masud Hauqe'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[#8E8E96] font-mono shrink-0">
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

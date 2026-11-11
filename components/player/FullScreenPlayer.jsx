'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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

/**
 * High-Performance Audio Spectrum Visualizer
 * Runs in its own 60fps requestAnimationFrame loop updating DOM heights directly.
 * Zero React re-renders during playback, completely eliminating stutter/freeze.
 */
function AudioSpectrumVisualizer({ isPlaying, audioMetrics }) {
  const barsRef = useRef([]);
  const animFrameRef = useRef(null);
  const heightsRef = useRef(new Array(32).fill(12));

  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time) => {
      const dt = Math.min(0.05, (time - lastTime) * 0.001);
      lastTime = time;
      const t = time * 0.001; // Continuous elapsed seconds (smooth float)

      const freqData = audioMetrics?.frequencyData;
      const hasRealAudio = Boolean(freqData && freqData.some((b) => b > 10));

      // Musical beat and tempo simulation (~124 BPM rhythm)
      const kick = Math.pow(Math.max(0, Math.sin(t * 4.3)), 4);
      const snare = Math.pow(Math.max(0, Math.sin((t + 0.35) * 4.3)), 6);
      const hihat = Math.pow(Math.max(0, Math.sin(t * 8.6)), 2);

      for (let i = 0; i < 32; i++) {
        let target = 8;

        if (isPlaying) {
          if (hasRealAudio) {
            // Map 32 bands across frequency bins
            const byteIdx = Math.floor((i / 32) * (freqData.length - 1));
            const raw = freqData[byteIdx] || 0;
            const norm = raw / 255;
            if (i < 8) {
              target = Math.min(94, Math.max(14, norm * 78 + kick * 22));
            } else {
              target = Math.min(92, Math.max(12, norm * 86));
            }
          } else {
            // Highly dynamic, organic sound wave synthesis with dancing bass, mids & highs
            if (i < 8) {
              // Bass & Sub-Bass (0 - 7): Bounces hard on kick, rolls with dynamic bassline (18% - 88%)
              const bassRoll = Math.sin(t * 6.0 + i * 0.45) * 0.35 + 0.55;
              const subThump = Math.cos(t * 8.5 + i * 0.3) * 0.2;
              target = Math.min(
                92,
                Math.max(14, 18 + kick * 54 + bassRoll * 22 + subThump * 10)
              );
            } else if (i < 22) {
              // Mid-Range & Vocals (8 - 21): Melodic sweeps, snare cracks, fluid oscillations
              const midWave =
                Math.sin(t * 8.2 + i * 0.7) * 0.35 +
                Math.cos(t * 12.4 + i * 0.5) * 0.25 +
                0.5;
              target = Math.min(
                90,
                Math.max(12, 14 + snare * 46 + midWave * 32)
              );
            } else {
              // Highs & Treble (22 - 31): Crisp hi-hat sizzle, shimmer & air
              const highSizzle = Math.sin(t * 16.0 + i * 1.1) * 0.35 + 0.5;
              const flutter = (Math.sin(t * 22.0 + i * 2.0) + 1) * 0.5;
              target = Math.min(
                85,
                Math.max(10, 12 + hihat * 38 + highSizzle * 24 + flutter * 12)
              );
            }
          }
        } else {
          // Paused / idle state: gentle breathing wave
          target = 8 + Math.sin(t * 1.8 + i * 0.25) * 4;
        }

        // Physical spring / lerp smoothing - instantaneous attack, smooth natural decay
        const current = heightsRef.current[i];
        const lerpFactor = target > current ? 0.42 : 0.22; // snappy rise, smooth fall
        const nextHeight = current + (target - current) * lerpFactor;
        heightsRef.current[i] = nextHeight;

        // Direct DOM update (ZERO React re-renders, silky smooth 60/120 FPS!)
        const barEl = barsRef.current[i];
        if (barEl) {
          barEl.style.height = `${nextHeight.toFixed(1)}%`;
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, audioMetrics]);

  return (
    <div className="h-24 sm:h-28 lg:h-32 px-3 py-2.5 rounded-2xl flex items-end justify-between gap-1 sm:gap-1.5 overflow-hidden">
      {Array.from({ length: 32 }).map((_, idx) => {
        const isBass = idx < 8;
        return (
          <div
            key={idx}
            className="flex-1 h-full flex items-end justify-center"
          >
            <div
              ref={(el) => (barsRef.current[idx] = el)}
              style={{ height: '14%' }}
              className={`w-full rounded-full will-change-[height] ${
                isBass
                  ? 'bg-gradient-to-t from-[#B45309] via-[#C8A464] to-[#FDE047] shadow-[0_0_12px_rgba(200,164,100,0.6)]'
                  : 'bg-gradient-to-t from-[#8E6F36] via-[#C8A464] to-[#F4F1EA]'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

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

  const isBeat = Boolean(audioMetrics?.beat);

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
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {currentTrack.thumbnail ? (
          <>
            {/* Real high-res artwork dynamically blurred and scaled */}
            <div className="absolute -inset-12 filter blur-2xl scale-110 opacity-55 transition-opacity duration-700 ease-out">
              <Image
                key={currentTrack.id || currentTrack.thumbnail}
                src={currentTrack.thumbnail}
                alt=""
                fill
                sizes="100vw"
                priority={false}
                referrerPolicy="no-referrer"
                className="object-cover object-center pointer-events-none"
              />
            </div>
            {/* Radial vignette for cinematic depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(7,7,9,0.55)_65%,rgba(7,7,9,0.92)_100%)]" />
            {/* Soft vertical gradient to preserve contrast for player controls */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#070709]/65 via-[#070709]/30 to-[#070709]/85" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(200,164,100,0.25)_0%,rgba(7,7,9,0.98)_75%)]" />
        )}
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
                      <Disc3 className="w-16 h-16 text-[#C8A464] animate-[spin_10s_linear_infinite]" />
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
          <div className="min-w-0 w-full max-w-xl flex flex-col justify-center space-y-3 sm:space-y-4">
            {/* Track Info */}
            <div className="text-center lg:text-left space-y-0.5 sm:space-y-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#F4F1EA] truncate">
                {currentTrack.title}
              </h1>
              {currentTrack.artist?.name && (
                <p className="text-xs sm:text-sm text-[#C8A464] font-medium truncate">
                  {currentTrack.artist.name}
                  {currentTrack.album?.title ? ` · ${currentTrack.album.title}` : ''}
                </p>
              )}
            </div>

            {/* ============================================================
                TALL AUDIO-REACTIVE SPECTRUM VISUALIZER (ENHANCED HEIGHT)
                32 Dynamic Dancing Bars: Bass, Mids, Highs animated at 60 FPS
            ============================================================ */}
            <AudioSpectrumVisualizer
              isPlaying={isPlaying}
              audioMetrics={audioMetrics}
            />

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
                  shuffle
                    ? 'text-[#C8A464] bg-[#C8A464]/15'
                    : 'text-[#8E8E96] hover:text-[#F4F1EA]'
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
            <div className="pt-2 flex items-center justify-between gap-3 text-xs">
              <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[220px]">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1 rounded-full text-[#8E8E96] hover:text-[#F4F1EA]"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="Volume slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1 bg-[#222228] accent-[#C8A464] rounded-lg cursor-pointer"
                />
              </div>

              {/* Download MP3 */}
              <div className="flex items-center gap-2 ml-auto">
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181E] hover:bg-[#25252E] text-[#D4D4D8] hover:text-[#C8A464] border border-white/10 text-xs font-medium transition-colors"
                    aria-label={`Download ${currentTrack.title} MP3`}
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
          QUEUE DRAWER MODAL
      ============================================================ */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-x-0 bottom-0 top-16 z-30 bg-[#0C0C12]/95 backdrop-blur-2xl border-t border-white/10 p-4 sm:p-6 flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base sm:text-lg font-semibold text-[#F4F1EA]">
                Up Next ({playlist.length} Tracks)
              </h2>
              <button
                type="button"
                onClick={() => setShowQueue(false)}
                className="text-xs text-[#C8A464] font-medium hover:underline"
              >
                Close Queue
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5 py-2">
              {playlist.map((item, index) => {
                const active = item.id === currentTrack.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      playTrack(item);
                      setShowQueue(false);
                    }}
                    className={`w-full text-left py-2.5 px-3 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                      active
                        ? 'bg-[#C8A464]/15 text-[#C8A464]'
                        : 'hover:bg-white/5 text-[#D4D4D8]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-[#8E8E96] w-5 text-right shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-sm truncate font-medium ${
                            active ? 'text-[#C8A464]' : 'text-[#F4F1EA]'
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.artist?.name && (
                          <p className="text-xs text-[#8E8E96] truncate">
                            {item.artist.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {item.duration && (
                      <span className="text-xs font-mono text-[#8E8E96] shrink-0">
                        {item.duration}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

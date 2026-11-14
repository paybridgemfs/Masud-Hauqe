'use client';

import React, { useEffect, useState } from 'react';
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
  Maximize2,
  Loader2,
} from 'lucide-react';
import { usePlayer } from './PlayerContext.jsx';
import {
  getPublicDownloadUrl,
  getTrackDownloadFilename,
} from '@/lib/storage/audio-delivery.js';
import { triggerManagedDownload } from '@/lib/client-download.js';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';
import FullScreenPlayer from './FullScreenPlayer.jsx';

function formatSeconds(secs) {
  if (!secs || Number.isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

function parseDurationToSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function PrecisionSeekBar({
  currentTime,
  maxDuration,
  isScrubbing,
  scrubValue,
  setIsScrubbing,
  setScrubValue,
  seekTo,
}) {
  const barRef = React.useRef(null);
  const displayTime = isScrubbing ? scrubValue : Math.min(currentTime, maxDuration);
  const progressPercent =
    maxDuration > 0 ? Math.max(0, Math.min(100, (displayTime / maxDuration) * 100)) : 0;

  function calcTime(clientX) {
    const el = barRef.current;
    if (!el) return displayTime;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return displayTime;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * maxDuration;
  }

  function handlePointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    const nextTime = calcTime(e.clientX);
    setIsScrubbing(true);
    setScrubValue(nextTime);
  }

  function handlePointerMove(e) {
    if (!isScrubbing) return;
    setScrubValue(calcTime(e.clientX));
  }

  function handlePointerUp(e) {
    if (!isScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    const finalTime = calcTime(e.clientX);
    setIsScrubbing(false);
    seekTo(finalTime);
  }

  return (
    <div
      ref={barRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(maxDuration)}
      aria-valuenow={Math.round(displayTime)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          seekTo(Math.min(maxDuration, displayTime + 5));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          seekTo(Math.max(0, displayTime - 5));
        }
      }}
      className="w-full py-2 cursor-pointer touch-none select-none group"
    >
      <div className="relative w-full h-1.5 bg-[#27272C] rounded-full overflow-visible">
        <div
          style={{ width: `${progressPercent}%` }}
          className="h-full bg-gradient-to-r from-[#9E7B3B] to-[#C8A464] rounded-full"
        />
        <div
          style={{ left: `${progressPercent}%` }}
          className="
            absolute top-1/2 -translate-x-1/2 -translate-y-1/2
            w-3 h-3 rounded-full bg-[#F4F1EA] border-2 border-[#C8A464]
            shadow-[0_0_8px_rgba(200,164,100,0.85)]
            transition-transform duration-100 group-hover:scale-125
          "
        />
      </div>
    </div>
  );
}

export default function GlobalMusicPlayer() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const desktopThumbRef = React.useRef(null);
  const mobileThumbRef = React.useRef(null);

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
    getRealtimeAudioData,
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

  const getAudioRef = React.useRef(getRealtimeAudioData);
  useEffect(() => {
    getAudioRef.current = getRealtimeAudioData;
  }, [getRealtimeAudioData]);

  // Real-time Bass & Beat-Reactive Scale ("Zoom In/Out") for Bottom Bar Thumbnails
  useEffect(() => {
    if (!currentTrack) return;

    let animId = null;
    let lastTime = performance.now();
    let currentScale = 1;
    let prevBass = 0;
    let bassFloor = 0.18;

    const animateBeat = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) * 0.001));
      lastTime = now;
      const t = now * 0.001;

      let targetScale = 1;
      let glowAlpha = 0;

      if (isPlaying) {
        const audioFrame = getAudioRef.current ? getAudioRef.current() : null;
        const freqData = audioFrame?.freqData;

        let maxSignal = 0;
        if (freqData) {
          for (let k = 1; k < 64; k++) {
            if (freqData[k] > maxSignal) maxSignal = freqData[k];
          }
        }

        if (freqData && maxSignal > 2) {
          // Sample Sub-Bass & Kick Drum fundamental bins (~35Hz to ~170Hz)
          let weightedSum = 0;
          let weightTotal = 0;
          for (let bin = 1; bin <= 8; bin++) {
            const weight = bin >= 2 && bin <= 5 ? 1.8 : 1.0;
            weightedSum += (freqData[bin] / 255) * weight;
            weightTotal += weight;
          }
          const rawBass = weightedSum / weightTotal;

          bassFloor =
            rawBass < bassFloor
              ? bassFloor * 0.92 + rawBass * 0.08
              : bassFloor * 0.985 + rawBass * 0.015;

          const dynamicFloor = Math.min(0.45, bassFloor * 0.72);
          const cleanBass = Math.max(
            0,
            (rawBass - dynamicFloor) / Math.max(0.32, 1 - dynamicFloor)
          );
          const bassTransient = Math.max(0, rawBass - prevBass);
          prevBass = rawBass * 0.6 + prevBass * 0.4;

          const beatImpulse = Math.min(
            1,
            Math.pow(cleanBass, 1.55) * 0.85 + bassTransient * 3.4
          );

          targetScale = 1 + beatImpulse * 0.18; // Scales up to 1.18x on bass/kick hits
          glowAlpha = Math.min(0.75, beatImpulse * 0.8);
        } else {
          // Fallback rhythmic beat bounce if WebAudio signal is not yet active
          const pulse = Math.pow(Math.max(0, Math.sin(t * 4.5)), 4);
          targetScale = 1 + pulse * 0.14;
          glowAlpha = pulse * 0.5;
        }
      }

      const speed = targetScale > currentScale ? 38 : 14;
      const alpha = 1 - Math.exp(-speed * dt);
      currentScale = currentScale + (targetScale - currentScale) * alpha;
      if (!isPlaying && Math.abs(currentScale - 1) < 0.002) {
        currentScale = 1;
      }

      const transformStr = `scale(${currentScale.toFixed(3)})`;
      const shadowStr =
        glowAlpha > 0.05
          ? `0 0 ${(8 + glowAlpha * 14).toFixed(1)}px rgba(200, 164, 100, ${glowAlpha.toFixed(2)})`
          : 'none';

      if (desktopThumbRef.current) {
        desktopThumbRef.current.style.transform = transformStr;
        desktopThumbRef.current.style.boxShadow = shadowStr;
      }
      if (mobileThumbRef.current) {
        mobileThumbRef.current.style.transform = transformStr;
        mobileThumbRef.current.style.boxShadow = shadowStr;
      }

      animId = requestAnimationFrame(animateBeat);
    };

    animId = requestAnimationFrame(animateBeat);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (!isScrubbing) return;
    const handleRelease = () => {
      setIsScrubbing(false);
    };
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleRelease);
    return () => {
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleRelease);
    };
  }, [isScrubbing]);

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
  const downloadFilename = getTrackDownloadFilename(currentTrack);
  const fallbackTrackDur = parseDurationToSeconds(currentTrack.duration);
  const safeMaxDuration = duration > 0 ? duration : fallbackTrackDur > 0 ? fallbackTrackDur : 100;
  const displayTime = isScrubbing ? scrubValue : Math.min(currentTime, safeMaxDuration);
  const formattedTotalDuration =
    duration > 0 ? formatSeconds(duration) : currentTrack.duration || formatSeconds(safeMaxDuration);

  async function handleDownloadCurrent() {
    if (!downloadUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      await triggerManagedDownload(downloadUrl, downloadFilename);
    } finally {
      setIsDownloading(false);
    }
  }

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
              <div
                ref={desktopThumbRef}
                className="relative w-12 h-12 rounded-md bg-[#18181C] border border-[#C8A464]/35 overflow-hidden shrink-0 flex items-center justify-center will-change-transform origin-center"
              >
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
                {currentTrack.artist?.name && (
                  <p className="text-xs text-[#9A9AA2] truncate mt-0.5">
                    {currentTrack.artist.name}
                    {currentTrack.album?.title ? ` · ${currentTrack.album.title}` : ''}
                  </p>
                )}
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
                  aria-label={isLoading ? 'Loading track' : isPlaying ? 'Pause' : 'Play'}
                  disabled={isLoading}
                  className="w-9 h-9 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center transition-colors disabled:opacity-75 disabled:cursor-wait shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
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

              <div className="w-full flex items-center gap-3 mt-1">
                <span className="text-[11px] text-[#8E8E96] tabular-nums w-9 text-right shrink-0">
                  {formatSeconds(displayTime)}
                </span>
                <PrecisionSeekBar
                  currentTime={currentTime}
                  maxDuration={safeMaxDuration}
                  isScrubbing={isScrubbing}
                  scrubValue={scrubValue}
                  setIsScrubbing={setIsScrubbing}
                  setScrubValue={setScrubValue}
                  seekTo={seekTo}
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
                <button
                  type="button"
                  onClick={handleDownloadCurrent}
                  disabled={isDownloading}
                  aria-label={`Download ${currentTrack.title} MP3`}
                  className="p-2 text-[#A1A1AA] hover:text-[#C8A464] transition-colors disabled:opacity-60 disabled:cursor-wait"
                  title="Download Authorized MP3"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#C8A464]" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                aria-label="Open full screen immersive player"
                title="Full Screen Player"
                className="p-2 rounded text-[#A1A1AA] hover:text-[#C8A464] hover:bg-[#1C1B18] transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

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
              {formatSeconds(displayTime)}
            </span>
            <PrecisionSeekBar
              currentTime={currentTime}
              maxDuration={safeMaxDuration}
              isScrubbing={isScrubbing}
              scrubValue={scrubValue}
              setIsScrubbing={setIsScrubbing}
              setScrubValue={setScrubValue}
              seekTo={seekTo}
            />
            <span className="text-[10px] text-[#8E8E96] tabular-nums w-7 shrink-0">
              {formattedTotalDuration}
            </span>
          </div>

          {/* Row 2: Compact Track Info + Transport & Utility Buttons */}
          <div className="flex items-center justify-between gap-2">
            {/* Track Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                ref={mobileThumbRef}
                className="relative w-10 h-10 rounded bg-[#18181C] border border-[#C8A464]/35 overflow-hidden shrink-0 flex items-center justify-center will-change-transform origin-center"
              >
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
                {currentTrack.artist?.name && (
                  <p className="text-[10px] text-[#9A9AA2] truncate">
                    {currentTrack.artist.name}
                  </p>
                )}
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
                aria-label={isLoading ? 'Loading track' : isPlaying ? 'Pause' : 'Play'}
                disabled={isLoading}
                className="w-8 h-8 mx-0.5 rounded-full bg-[#C8A464] text-[#09090B] flex items-center justify-center transition-colors disabled:opacity-75 disabled:cursor-wait shadow"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
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
                <button
                  type="button"
                  onClick={handleDownloadCurrent}
                  disabled={isDownloading}
                  aria-label={`Download ${currentTrack.title} MP3`}
                  className="p-1.5 text-[#A1A1AA] hover:text-[#C8A464] transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C8A464]" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                aria-label="Open full screen player"
                className="p-1.5 rounded text-[#A1A1AA] hover:text-[#C8A464] transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

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

      {/* Full Screen Immersive Music Player with Bottom-to-Top Animation & Audio-Responsive Visualizer */}
      <AnimatePresence>
        {isFullScreen && (
          <FullScreenPlayer
            isOpen={isFullScreen}
            onClose={() => setIsFullScreen(false)}
            currentTrack={currentTrack}
            playlist={playlist}
            isPlaying={isPlaying}
            isLoading={isLoading}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            shuffle={shuffle}
            repeatMode={repeatMode}
            getRealtimeAudioData={getRealtimeAudioData}
            togglePlay={togglePlay}
            playNext={playNext}
            playPrevious={playPrevious}
            seekTo={seekTo}
            setVolume={setVolume}
            toggleMute={toggleMute}
            setShuffle={setShuffle}
            cycleRepeatMode={cycleRepeatMode}
            playTrack={playTrack}
            formatSeconds={formatSeconds}
            downloadUrl={downloadUrl}
            downloadFilename={downloadFilename}
          />
        )}
      </AnimatePresence>
    </>
  );
}

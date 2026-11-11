'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';

export default function FloatingMiniVisualizer({
  currentTrack,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  togglePlay,
  playNext,
  playPrevious,
  isPipExpanded,
  setIsPipExpanded,
  onClose,
  formatSeconds,
  isMuted,
  toggleMute,
}) {
  if (!currentTrack) return null;

  const safeMax = duration > 0 ? duration : 100;
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 30 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed z-50 transition-all duration-300 ${
        isPipExpanded
          ? 'bottom-28 md:bottom-24 right-4 sm:right-8 w-[320px] bg-[#111116]/95 backdrop-blur-xl border border-[#C8A464]/40 rounded-xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] p-4 text-[#F4F1EA] overflow-hidden'
          : 'bottom-28 md:bottom-24 right-4 sm:right-8 bg-[#111115]/95 backdrop-blur-xl border border-[#2E2E38] hover:border-[#C8A464]/60 rounded-full shadow-2xl pl-2 pr-3 py-1.5 flex items-center gap-3'
      }`}
    >
      {/* Ambient background glow when playing */}
      {isPlaying && (
        <div className="absolute -inset-1 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(200,164,100,0.18)_0%,transparent_70%)] animate-pulse" />
      )}

      {isPipExpanded ? (
        /* ================= EXPANDED FLOATING PiP CARD ================= */
        <div className="relative z-10 space-y-3.5">
          {/* Top Bar with Status + Minimize + Close */}
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#222228]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isPlaying && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8A464] opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-[#C8A464]' : 'bg-[#71717A]'}`} />
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#C8A464]">
                {isPlaying ? 'Live Floating Studio' : 'Audio Paused'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsPipExpanded(false)}
                title="Minimize to Floating Orb"
                className="p-1 rounded text-[#9A9AA2] hover:text-[#F4F1EA] hover:bg-[#1E1E24] transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Hide Floating Player"
                className="p-1 rounded text-[#9A9AA2] hover:text-[#F87171] hover:bg-[#2A1215] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Artwork + Live Frequency Waveform Visualizer */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-[#17171C] border border-[#26262E] flex items-center justify-center">
            {currentTrack.thumbnail && (
              <ShimmerImage
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                fill
                sizes="320px"
                className="object-cover opacity-40 blur-[1px]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/60 to-transparent" />

            {/* Central Animated Audio Frequency Equalizer Bars */}
            <div className="relative z-10 flex items-end gap-1.5 h-14 px-4">
              {[0.4, 0.85, 0.55, 1, 0.7, 0.9, 0.45, 0.75, 0.95, 0.6, 0.8, 0.5, 0.88, 0.65].map(
                (h, idx) => (
                  <motion.span
                    key={idx}
                    animate={
                      isPlaying
                        ? {
                            height: [`${h * 20}%`, `${h * 100}%`, `${h * 35}%`, `${h * 85}%`],
                          }
                        : { height: '12%' }
                    }
                    transition={{
                      duration: 0.65 + (idx % 4) * 0.15,
                      repeat: Infinity,
                      repeatType: 'reverse',
                      ease: 'easeInOut',
                      delay: (idx * 0.05) % 0.4,
                    }}
                    className="w-1.5 bg-gradient-to-t from-[#8E6F36] via-[#C8A464] to-[#F4F1EA] rounded-full shadow-[0_0_8px_rgba(200,164,100,0.5)]"
                  />
                )
              )}
            </div>
          </div>

          {/* Track Details */}
          <div>
            <p className="text-sm font-bold text-[#F4F1EA] truncate leading-tight">
              {currentTrack.title}
            </p>
            <p className="text-xs text-[#C8A464] truncate mt-0.5">
              {currentTrack.artist?.name || 'Masud Hauqe'}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-1">
            <div className="w-full h-1 bg-[#26262E] rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-[#8E6F36] to-[#C8A464] rounded-full transition-all duration-200"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#8E8E96] font-mono">
              <span>{formatSeconds(currentTime)}</span>
              <span>{duration > 0 ? formatSeconds(duration) : currentTrack.duration || '0:00'}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-[#8E8E96] hover:text-[#F4F1EA] transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={playPrevious}
                className="p-1.5 text-[#D4D4D8] hover:text-[#C8A464] transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                disabled={isLoading}
                className="w-10 h-10 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center transition-transform hover:scale-105 shadow-md"
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
                className="p-1.5 text-[#D4D4D8] hover:text-[#C8A464] transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="w-6" />
          </div>
        </div>
      ) : (
        /* ================= COMPACT FLOATING PiP ORB ================= */
        <div className="relative z-10 flex items-center gap-2.5">
          {/* Mini Rotating Artwork */}
          <div
            onClick={() => setIsPipExpanded(true)}
            className="relative w-8 h-8 rounded-full overflow-hidden border border-[#C8A464]/60 cursor-pointer shrink-0"
          >
            {currentTrack.thumbnail && (
              <ShimmerImage
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                fill
                sizes="32px"
                className={`object-cover ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
              />
            )}
          </div>

          {/* Mini Waveform Bars */}
          <div
            onClick={() => setIsPipExpanded(true)}
            className="flex items-end gap-0.5 h-4 cursor-pointer"
          >
            {[0.4, 0.9, 0.6, 1, 0.7].map((h, i) => (
              <motion.span
                key={i}
                animate={
                  isPlaying
                    ? { height: [`${h * 25}%`, `${h * 100}%`, `${h * 30}%`] }
                    : { height: '20%' }
                }
                transition={{
                  duration: 0.5 + i * 0.1,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
                className="w-0.5 bg-[#C8A464] rounded-full"
              />
            ))}
          </div>

          {/* Mini Track Name */}
          <div
            onClick={() => setIsPipExpanded(true)}
            className="max-w-[110px] sm:max-w-[140px] truncate cursor-pointer text-left"
          >
            <p className="text-xs font-semibold text-[#F4F1EA] truncate leading-tight">
              {currentTrack.title}
            </p>
          </div>

          {/* Quick Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className="w-7 h-7 rounded-full bg-[#C8A464] text-[#09090B] flex items-center justify-center shrink-0 shadow transition-transform hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>

          {/* Expand to PiP Card */}
          <button
            type="button"
            onClick={() => setIsPipExpanded(true)}
            title="Expand PiP Player"
            className="p-1 text-[#8E8E96] hover:text-[#C8A464] transition-colors shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

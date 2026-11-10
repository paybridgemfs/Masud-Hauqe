'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
      } else if (e.code === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        seekTo(currentTime + 5);
      } else if (e.code === 'ArrowLeft' && e.altKey) {
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

  return (
    <>
      {/* Playlist Drawer */}
      {isPlaylistOpen && (
        <aside
          aria-label="Current playback queue"
          className="fixed bottom-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-[#111114] border border-[#26262B] rounded-lg shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222226]">
            <span className="text-sm font-semibold tracking-wide text-[#F4F1EA]">
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
          <div className="max-h-64 overflow-y-auto divide-y divide-[#1E1E22]">
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
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[#8E8E96] truncate">
                      {item.artist?.name || 'Masud Hauqe'}
                    </p>
                  </div>
                  <span className="text-xs text-[#8E8E96] tabular-nums shrink-0">
                    {item.duration || '0:00'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* Error Toast above player if audio stream fails */}
      {error && (
        <div
          role="alert"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100vw-2rem)] bg-[#2A1215] border border-[#7F1D1D] text-[#FECACA] px-4 py-2.5 rounded-lg flex items-center justify-between gap-3 shadow-xl"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
            <span>{error}</span>
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

      {/* Persistent Player Bar */}
      <div
        role="region"
        aria-label="Global music player"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#0D0D10]/95 backdrop-blur-md border-t border-[#222226] px-4 sm:px-6 py-2.5"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Track Identity */}
          <div className="flex items-center gap-3 min-w-0 w-1/4 sm:w-1/3">
            <div className="relative w-11 h-11 rounded bg-[#18181C] border border-[#27272C] overflow-hidden shrink-0 flex items-center justify-center">
              {currentTrack.thumbnail ? (
                <Image
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  fill
                  sizes="44px"
                  referrerPolicy="no-referrer"
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
              <p className="text-xs text-[#9A9AA2] truncate">
                {currentTrack.artist?.name || 'Masud Hauqe'}
                {currentTrack.album?.title ? ` · ${currentTrack.album.title}` : ''}
              </p>
            </div>
          </div>

          {/* Center Transport & Seek Bar */}
          <div className="flex flex-col items-center flex-1 max-w-xl">
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                type="button"
                onClick={() => setShuffle(!shuffle)}
                aria-label="Toggle shuffle"
                className={`hidden sm:inline-flex p-1.5 rounded transition-colors ${
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
                className="w-9 h-9 rounded-full bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] flex items-center justify-center transition-colors disabled:opacity-50"
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
                className={`hidden sm:inline-flex p-1.5 rounded transition-colors ${
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

            <div className="w-full flex items-center gap-2.5 mt-1">
              <span className="text-[11px] text-[#8E8E96] tabular-nums w-8 text-right">
                {formatSeconds(currentTime)}
              </span>
              <input
                type="range"
                aria-label="Seek audio position"
                min={0}
                max={duration > 0 ? duration : 100}
                step={0.5}
                value={duration > 0 ? currentTime : 0}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="flex-1 h-1 bg-[#27272C] accent-[#C8A464] rounded-lg cursor-pointer"
              />
              <span className="text-[11px] text-[#8E8E96] tabular-nums w-8">
                {duration > 0 ? formatSeconds(duration) : currentTrack.duration || '0:00'}
              </span>
            </div>
          </div>

          {/* Right Volume, Download & Queue Controls */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 w-1/4 sm:w-1/3">
            <div className="hidden md:flex items-center gap-2">
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
                className="w-20 h-1 bg-[#27272C] accent-[#C8A464] rounded-lg cursor-pointer"
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
              className={`p-2 rounded transition-colors ${
                isPlaylistOpen ? 'text-[#C8A464] bg-[#1C1B18]' : 'text-[#A1A1AA] hover:text-[#F4F1EA]'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

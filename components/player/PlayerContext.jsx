'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Howl } from 'howler';
import { getPublicStreamUrl } from '@/lib/storage/audio-delivery.js';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [error, setError] = useState(null);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  const howlRef = useRef(null);
  const rafRef = useRef(null);
  const currentTrack = currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null;

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleTrackEndedRef = useRef(() => {});

  const updateProgress = useCallback(() => {
    const step = () => {
      if (howlRef.current && howlRef.current.playing()) {
        const seek = howlRef.current.seek();
        if (typeof seek === 'number') {
          setCurrentTime(seek);
        }
        rafRef.current = requestAnimationFrame(step);
      }
    };
    step();
  }, []);

  const destroyHowl = useCallback(() => {
    stopProgressLoop();
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
  }, [stopProgressLoop]);

  const loadAndPlayTrack = useCallback(
    (track, autoPlay = true) => {
      destroyHowl();
      setError(null);
      setCurrentTime(0);
      setDuration(0);

      if (!track || !track.id) {
        setError('Selected music record is invalid or missing.');
        return;
      }

      if (!track.audioFileId) {
        setError('This track does not have a linked Google Drive MP3 file ID.');
        return;
      }

      const streamUrl = getPublicStreamUrl(track);
      if (!streamUrl) {
        setError('Unable to resolve valid Google Drive stream endpoint for this track.');
        return;
      }

      setIsLoading(true);

      const sound = new Howl({
        src: [streamUrl],
        html5: true,
        format: ['mp3', 'mpeg'],
        volume: isMuted ? 0 : volume,
        onload: () => {
          setIsLoading(false);
          setDuration(sound.duration() || 0);
        },
        onplay: () => {
          setIsLoading(false);
          setIsPlaying(true);
          setDuration(sound.duration() || 0);
          stopProgressLoop();
          rafRef.current = requestAnimationFrame(updateProgress);
        },
        onpause: () => {
          setIsPlaying(false);
          stopProgressLoop();
        },
        onstop: () => {
          setIsPlaying(false);
          setCurrentTime(0);
          stopProgressLoop();
        },
        onend: () => {
          stopProgressLoop();
          setIsPlaying(false);
          setCurrentTime(0);
          handleTrackEndedRef.current();
        },
        onloaderror: (_id, errCode) => {
          setIsLoading(false);
          setIsPlaying(false);
          setError(
            `Unable to load MP3 stream from Google Drive (code ${errCode}). Verify that the Google Drive file exists and has public reader permission.`
          );
        },
        onplayerror: (_id, errCode) => {
          setIsLoading(false);
          setIsPlaying(false);
          setError(`Audio playback interrupted (code ${errCode}). Click play to retry.`);
        },
      });

      howlRef.current = sound;
      if (autoPlay) {
        sound.play();
      }
    },
    [destroyHowl, isMuted, stopProgressLoop, updateProgress, volume]
  );

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one' && howlRef.current) {
      howlRef.current.seek(0);
      howlRef.current.play();
      return;
    }

    setPlaylist((currentList) => {
      if (currentList.length === 0) return currentList;
      setCurrentIndex((prevIdx) => {
        if (shuffle && currentList.length > 1) {
          let nextIdx = Math.floor(Math.random() * currentList.length);
          if (nextIdx === prevIdx) {
            nextIdx = (prevIdx + 1) % currentList.length;
          }
          setTimeout(() => loadAndPlayTrack(currentList[nextIdx], true), 0);
          return nextIdx;
        }
        const isLast = prevIdx >= currentList.length - 1;
        if (isLast && repeatMode !== 'all') {
          return prevIdx;
        }
        const nextIdx = (prevIdx + 1) % currentList.length;
        setTimeout(() => loadAndPlayTrack(currentList[nextIdx], true), 0);
        return nextIdx;
      });
      return currentList;
    });
  }, [loadAndPlayTrack, repeatMode, shuffle]);

  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);

  const playTrack = useCallback(
    (track, customQueue = null) => {
      if (!track || !track.id) return;
      const targetQueue = Array.isArray(customQueue) && customQueue.length > 0 ? customQueue : playlist;
      const existingIdx = targetQueue.findIndex((t) => t.id === track.id);

      if (existingIdx !== -1) {
        if (customQueue) setPlaylist(targetQueue);
        if (currentIndex === existingIdx && currentTrack?.id === track.id && howlRef.current) {
          if (howlRef.current.playing()) {
            howlRef.current.pause();
          } else {
            howlRef.current.play();
          }
          return;
        }
        setCurrentIndex(existingIdx);
        loadAndPlayTrack(targetQueue[existingIdx], true);
      } else {
        const nextQueue = [track, ...targetQueue];
        setPlaylist(nextQueue);
        setCurrentIndex(0);
        loadAndPlayTrack(track, true);
      }
    },
    [currentIndex, currentTrack?.id, loadAndPlayTrack, playlist]
  );

  const playAlbum = useCallback(
    (tracks, startIndex = 0) => {
      if (!Array.isArray(tracks) || tracks.length === 0) return;
      const safeIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      setPlaylist(tracks);
      setCurrentIndex(safeIndex);
      loadAndPlayTrack(tracks[safeIndex], true);
    },
    [loadAndPlayTrack]
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (!howlRef.current) {
      loadAndPlayTrack(currentTrack, true);
      return;
    }
    if (howlRef.current.playing()) {
      howlRef.current.pause();
    } else {
      howlRef.current.play();
    }
  }, [currentTrack, loadAndPlayTrack]);

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    let nextIdx = (currentIndex + 1) % playlist.length;
    if (shuffle && playlist.length > 1) {
      nextIdx = Math.floor(Math.random() * playlist.length);
    }
    setCurrentIndex(nextIdx);
    loadAndPlayTrack(playlist[nextIdx], true);
  }, [currentIndex, loadAndPlayTrack, playlist, shuffle]);

  const playPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    if (currentTime > 3 && howlRef.current) {
      howlRef.current.seek(0);
      setCurrentTime(0);
      return;
    }
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    loadAndPlayTrack(playlist[prevIdx], true);
  }, [currentIndex, currentTime, loadAndPlayTrack, playlist]);

  const seekTo = useCallback((seconds) => {
    if (!howlRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, howlRef.current.duration() || 0));
    howlRef.current.seek(clamped);
    setCurrentTime(clamped);
  }, []);

  const setVolume = useCallback(
    (val) => {
      const clamped = Math.max(0, Math.min(1, Number(val)));
      setVolumeState(clamped);
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
      }
      if (howlRef.current) {
        howlRef.current.volume(clamped);
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (howlRef.current) {
        howlRef.current.volume(next ? 0 : volume);
      }
      return next;
    });
  }, [volume]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const closePlayer = useCallback(() => {
    destroyHowl();
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentIndex(-1);
    setIsPlaylistOpen(false);
    setError(null);
  }, [destroyHowl]);

  useEffect(() => {
    return () => {
      destroyHowl();
    };
  }, [destroyHowl]);

  return (
    <PlayerContext.Provider
      value={{
        playlist,
        currentTrack,
        currentIndex,
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
        playTrack,
        playAlbum,
        togglePlay,
        playNext,
        playPrevious,
        seekTo,
        setVolume,
        toggleMute,
        closePlayer,
        clearError: () => setError(null),
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return ctx;
}

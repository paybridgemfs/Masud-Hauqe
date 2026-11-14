'use client';

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getPublicStreamUrl } from '@/lib/storage/audio-delivery.js';

const PlayerContext = createContext(null);

function parseDurationString(str) {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

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

  // Strictly ONE singleton HTML5 Audio element for the entire app — physically impossible to double-play!
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceConnectedRef = useRef(false);
  const hasReceivedSignalRef = useRef(false);
  const freqBufferRef = useRef(null);
  const timeBufferRef = useRef(null);

  const isPlayingRef = useRef(false);
  const pendingSeekTargetRef = useRef(null);
  const lastSeekTimestampRef = useRef(0);
  const lastReportedTimeRef = useRef(-1);
  const activeLoadIdRef = useRef(0);
  const volumeRef = useRef(0.85);
  const isMutedRef = useRef(false);
  const handleTrackEndedRef = useRef(() => {});

  const currentTrack =
    currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null;

  /**
   * Ensure Web Audio API AnalyserNode is hooked once to our singleton <audio> element.
   */
  const ensureWebAudioGraph = useCallback(() => {
    try {
      if (typeof window === 'undefined' || !audioRef.current) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }

      if (!analyserRef.current) {
        const analyser = audioCtxRef.current.createAnalyser();
        analyser.fftSize = 2048; // 1024 high-resolution frequency bins (~21.5Hz per bin)
        analyser.minDecibels = -88;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.62; // Crisp, real-time beat response
        analyserRef.current = analyser;
      }

      if (!sourceConnectedRef.current) {
        const source = audioCtxRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
        sourceConnectedRef.current = true;
      }
    } catch {
      // Safe fallback if browser restricts Web Audio graph
    }
  }, []);

  /**
   * Zero-latency real-time audio frame reader called directly inside the 60/120fps visualizer RAF loop.
   */
  const getRealtimeAudioData = useCallback(() => {
    const analyser = analyserRef.current;
    const audioCtx = audioCtxRef.current;
    if (!analyser || !audioCtx || audioCtx.state !== 'running') {
      return null;
    }

    try {
      const binCount = analyser.frequencyBinCount; // 1024
      if (!freqBufferRef.current || freqBufferRef.current.length !== binCount) {
        freqBufferRef.current = new Uint8Array(binCount);
      }
      if (!timeBufferRef.current || timeBufferRef.current.length !== binCount) {
        timeBufferRef.current = new Uint8Array(binCount);
      }

      analyser.getByteFrequencyData(freqBufferRef.current);
      analyser.getByteTimeDomainData(timeBufferRef.current);

      if (!hasReceivedSignalRef.current) {
        for (let i = 1; i < 64; i++) {
          if (freqBufferRef.current[i] > 0) {
            hasReceivedSignalRef.current = true;
            break;
          }
        }
      }

      return {
        freqData: freqBufferRef.current,
        timeData: timeBufferRef.current,
        binCount,
        sampleRate: audioCtx.sampleRate || 44100,
        isAnalyserActive: hasReceivedSignalRef.current,
      };
    } catch {
      return null;
    }
  }, []);

  /**
   * Initialize the single persistent HTML5 <audio> element and bind native lifecycle events once.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      ensureWebAudioGraph();
    };

    const handlePause = () => {
      // Do not flip isPlaying to false if the browser is merely mid-seek
      if (!audio.seeking && !audio.ended) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleSeeked = () => {
      setIsLoading(false);
      const actualTime = audio.currentTime;
      if (typeof actualTime === 'number' && !Number.isNaN(actualTime)) {
        pendingSeekTargetRef.current = null;
        lastReportedTimeRef.current = actualTime;
        setCurrentTime(actualTime);
      }
    };

    const handleTimeUpdate = () => {
      const now = performance.now();
      const target = pendingSeekTargetRef.current;

      // While a manual seek is in flight, prevent stale pre-seek timeupdate events from snapping the bar back
      if (target !== null) {
        if (audio.seeking || now - lastSeekTimestampRef.current < 900) {
          if (Math.abs(audio.currentTime - target) > 2.0) {
            return;
          }
        }
        pendingSeekTargetRef.current = null;
      }

      if (!audio.seeking) {
        const pos = audio.currentTime;
        if (typeof pos === 'number' && !Number.isNaN(pos)) {
          if (Math.abs(pos - lastReportedTimeRef.current) >= 0.08) {
            lastReportedTimeRef.current = pos;
            setCurrentTime(pos);
          }
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      pendingSeekTargetRef.current = null;
      setCurrentTime(0);
      lastReportedTimeRef.current = 0;
      handleTrackEndedRef.current();
    };

    const handleError = () => {
      // Ignore error events triggered when resetting src=""
      if (!audio.getAttribute('src')) return;
      setIsLoading(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setError(
        'Unable to stream MP3 from Google Drive. Verify that the file exists and has public reader permission.'
      );
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [ensureWebAudioGraph]);

  const stopAndResetAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch {
      // Ignore
    }
    isPlayingRef.current = false;
    pendingSeekTargetRef.current = null;
    lastReportedTimeRef.current = 0;
  }, []);

  const loadAndPlayTrack = useCallback(
    (track, autoPlay = true) => {
      const audio = audioRef.current;
      if (!audio) return;

      const requestId = ++activeLoadIdRef.current;

      // Immediately halt any previous playback on our single audio element
      audio.pause();
      pendingSeekTargetRef.current = null;
      lastReportedTimeRef.current = 0;
      hasReceivedSignalRef.current = false;
      setError(null);
      setCurrentTime(0);

      const fallbackDur = parseDurationString(track?.duration);
      setDuration(fallbackDur > 0 ? fallbackDur : 0);

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
      audio.volume = isMutedRef.current ? 0 : volumeRef.current;
      audio.src = streamUrl;
      audio.load();

      if (autoPlay) {
        ensureWebAudioGraph();
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (activeLoadIdRef.current !== requestId) {
                audio.pause();
                return;
              }
              setIsLoading(false);
              setIsPlaying(true);
              isPlayingRef.current = true;
            })
            .catch((err) => {
              if (activeLoadIdRef.current !== requestId) return;
              // Ignore AbortError when user rapidly switches tracks or seeks
              if (err?.name === 'AbortError') return;
              setIsLoading(false);
              setIsPlaying(false);
              isPlayingRef.current = false;
            });
        }
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    },
    [ensureWebAudioGraph]
  );

  const seekTo = useCallback(
    (seconds) => {
      const audio = audioRef.current;
      if (!audio || !audio.src) return;

      const rawDur =
        (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration) || 0;
      const target = Math.max(
        0,
        Math.min(
          Number(seconds) || 0,
          rawDur > 0 ? Math.max(0, rawDur - 0.1) : Number(seconds) || 0
        )
      );

      pendingSeekTargetRef.current = target;
      lastSeekTimestampRef.current = performance.now();
      lastReportedTimeRef.current = target;
      setCurrentTime(target);

      try {
        ensureWebAudioGraph();
        audio.currentTime = target;
      } catch {
        // Safe fallback if stream metadata is still initializing
      }
    },
    [duration, ensureWebAudioGraph]
  );

  const handleTrackEnded = useCallback(() => {
    const audio = audioRef.current;
    if (repeatMode === 'one' && audio) {
      seekTo(0);
      audio.play().catch(() => {});
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
  }, [loadAndPlayTrack, repeatMode, seekTo, shuffle]);

  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (!audio || !audio.getAttribute('src')) {
      loadAndPlayTrack(currentTrack, true);
      return;
    }

    if (!audio.paused && isPlayingRef.current) {
      audio.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsLoading(false);
    } else {
      if (audio.readyState < 3) {
        setIsLoading(true);
      }
      ensureWebAudioGraph();
      audio
        .play()
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
          isPlayingRef.current = true;
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [currentTrack, ensureWebAudioGraph, loadAndPlayTrack]);

  const playTrack = useCallback(
    (track, customQueue = null) => {
      if (!track || !track.id) return;
      const targetQueue =
        Array.isArray(customQueue) && customQueue.length > 0 ? customQueue : playlist;
      const existingIdx = targetQueue.findIndex((t) => t.id === track.id);

      if (existingIdx !== -1) {
        if (customQueue) setPlaylist(targetQueue);
        if (
          currentIndex === existingIdx &&
          currentTrack?.id === track.id &&
          audioRef.current &&
          audioRef.current.getAttribute('src')
        ) {
          togglePlay();
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
    [currentIndex, currentTrack?.id, loadAndPlayTrack, playlist, togglePlay]
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
    if (currentTime > 3 && audioRef.current && audioRef.current.getAttribute('src')) {
      seekTo(0);
      return;
    }
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    loadAndPlayTrack(playlist[prevIdx], true);
  }, [currentIndex, currentTime, loadAndPlayTrack, playlist, seekTo]);

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, Number(val)));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    if (clamped > 0 && isMutedRef.current) {
      isMutedRef.current = false;
      setIsMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volumeRef.current;
      }
      return next;
    });
  }, []);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const closePlayer = useCallback(() => {
    stopAndResetAudio();
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentIndex(-1);
    setIsPlaylistOpen(false);
    setError(null);
  }, [stopAndResetAudio]);

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
        getRealtimeAudioData,
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

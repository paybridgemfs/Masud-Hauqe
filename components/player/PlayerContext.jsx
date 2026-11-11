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
  const [audioMetrics, setAudioMetrics] = useState({
    frequencyData: new Uint8Array(32),
    volume: 0,
    bassIntensity: 0,
    spectralEnergy: 0,
    transient: 0,
    stereoWidth: 0.5,
    beat: false,
  });

  const howlRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const connectedAudioElementRef = useRef(null);
  const lastBassRef = useRef(0);
  const lastSeekTimeRef = useRef(0);
  const currentTrack = currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null;

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleTrackEndedRef = useRef(() => {});

  const updateProgress = useCallback(() => {
    const freqArray = new Uint8Array(32);
    let lastMetricUpdate = 0;
    let lastSeekUpdate = 0;

    const step = () => {
      if (howlRef.current && howlRef.current.playing()) {
        const now = performance.now();

        // Update seek position every ~120ms, skipping if user just seeked in the last 400ms
        if (now - lastSeekUpdate > 120 && now - lastSeekTimeRef.current > 400) {
          lastSeekUpdate = now;
          const seek = howlRef.current.seek();
          if (typeof seek === 'number' && !isNaN(seek)) {
            setCurrentTime(seek);
          }
        }

        // Throttle audio metrics to ~25fps for state listeners
        if (now - lastMetricUpdate > 40) {
          lastMetricUpdate = now;

          if (analyserRef.current) {
            try {
              analyserRef.current.getByteFrequencyData(freqArray);
              let sum = 0;
              let bassSum = 0;
              for (let i = 0; i < 32; i++) {
                sum += freqArray[i];
                if (i < 8) bassSum += freqArray[i];
              }
              const avg = sum / 32 / 255;
              const bass = bassSum / 8 / 255;
              const transient = Math.max(0, bass - lastBassRef.current);
              lastBassRef.current = bass * 0.85;
              const isBeat = transient > 0.16 || bass > 0.65;

              setAudioMetrics({
                frequencyData: freqArray,
                volume: avg,
                bassIntensity: bass,
                spectralEnergy: sum / (32 * 255),
                transient: transient,
                stereoWidth: Math.min(1, 0.4 + avg * 0.6),
                beat: isBeat,
              });
            } catch {
              // Audio node pass-through
            }
          } else {
            const seek = howlRef.current.seek();
            const t = typeof seek === 'number' ? seek : 0;
            const bassSynth = Math.max(0, Math.sin(t * 8.8) * 0.5 + Math.cos(t * 4.4) * 0.5);
            const isBeat = Math.sin(t * 8.8) > 0.75;
            setAudioMetrics({
              frequencyData: freqArray,
              volume: 0.65,
              bassIntensity: bassSynth,
              spectralEnergy: 0.6,
              transient: isBeat ? 0.8 : 0.1,
              stereoWidth: 0.8,
              beat: isBeat,
            });
          }
        }

        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const setupWebAudioAnalyser = useCallback((audioNode) => {
    try {
      if (typeof window === 'undefined') return;
      if (!audioNode || connectedAudioElementRef.current === audioNode) return;

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
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
      }

      // Create MediaElementSource and connect to analyser then destination
      audioNode.crossOrigin = 'anonymous';
      const source = audioCtxRef.current.createMediaElementSource(audioNode);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
      sourceNodeRef.current = source;
      connectedAudioElementRef.current = audioNode;
    } catch {
      // If CORS or already connected, fallback smoothly to audioMetrics
    }
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
        onplay: (soundId) => {
          setIsLoading(false);
          setIsPlaying(true);
          setDuration(sound.duration() || 0);

          // Hook HTML5 Audio Element to Web Audio Analyser
          try {
            const html5AudioNode = sound._sounds?.find((s) => s._id === soundId)?._node;
            if (html5AudioNode) {
              setupWebAudioAnalyser(html5AudioNode);
            }
          } catch {
            // Ignore if already connected
          }

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
        onseek: () => {
          // Allow progress updates once Howler confirms seeking is complete
          setTimeout(() => {
            lastSeekTimeRef.current = 0;
          }, 150);
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
    [destroyHowl, isMuted, setupWebAudioAnalyser, stopProgressLoop, updateProgress, volume]
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
    const dur = howlRef.current.duration() || 0;
    const clamped = Math.max(0, Math.min(seconds, dur > 0 ? dur : seconds));
    lastSeekTimeRef.current = performance.now();
    setCurrentTime(clamped);
    try {
      howlRef.current.seek(clamped);
    } catch {
      // Audio element seeking safe fallback
    }
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
        audioMetrics,
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

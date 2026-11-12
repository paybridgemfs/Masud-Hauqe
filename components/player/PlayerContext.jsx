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
  const audioNodeRef = useRef(null);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const freqBufferRef = useRef(null);
  const timeBufferRef = useRef(null);
  const connectedNodesMapRef = useRef(new WeakMap());
  const attachedNodesSetRef = useRef(new WeakSet());

  const isPlayingRef = useRef(false);
  const isSeekingRef = useRef(false);
  const lastSeekTimeRef = useRef(0);
  const targetSeekValueRef = useRef(0);
  const lastReportedTimeRef = useRef(-1);
  const handleTrackEndedRef = useRef(() => {});

  const currentTrack =
    currentIndex >= 0 && currentIndex < playlist.length ? playlist[currentIndex] : null;

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  /**
   * High-precision, zero-allocation real-time audio frame reader.
   * Called directly by the 60fps canvas/DOM visualizer without triggering React state re-renders.
   */
  const getRealtimeAudioData = useCallback(() => {
    const analyser = analyserRef.current;
    const audioCtx = audioCtxRef.current;
    if (!analyser || !audioCtx || audioCtx.state !== 'running') {
      return null;
    }

    try {
      const binCount = analyser.frequencyBinCount; // 1024 for fftSize=2048
      if (!freqBufferRef.current || freqBufferRef.current.length !== binCount) {
        freqBufferRef.current = new Uint8Array(binCount);
      }
      if (!timeBufferRef.current || timeBufferRef.current.length !== binCount) {
        timeBufferRef.current = new Uint8Array(binCount);
      }

      analyser.getByteFrequencyData(freqBufferRef.current);
      analyser.getByteTimeDomainData(timeBufferRef.current);

      return {
        freqData: freqBufferRef.current,
        timeData: timeBufferRef.current,
        binCount,
        sampleRate: audioCtx.sampleRate || 44100,
      };
    } catch {
      return null;
    }
  }, []);

  const startProgressLoop = useCallback(() => {
    stopProgressLoop();
    let lastUiTick = 0;

    const step = (now) => {
      if (!howlRef.current) {
        rafRef.current = null;
        return;
      }

      // Keep RAF loop alive as long as track is loaded and in playing state (even while seeking/buffering)
      if (isPlayingRef.current || howlRef.current.playing()) {
        if (now - lastUiTick >= 80) {
          lastUiTick = now;
          const timeSinceManualSeek = now - lastSeekTimeRef.current;

          if (!isSeekingRef.current && timeSinceManualSeek > 280) {
            const node = audioNodeRef.current;
            let pos = null;

            if (node && !node.seeking && typeof node.currentTime === 'number' && !Number.isNaN(node.currentTime)) {
              pos = node.currentTime;
            } else {
              const howlPos = howlRef.current.seek();
              if (typeof howlPos === 'number' && !Number.isNaN(howlPos)) {
                pos = howlPos;
              }
            }

            if (pos !== null && Math.abs(pos - lastReportedTimeRef.current) >= 0.05) {
              lastReportedTimeRef.current = pos;
              setCurrentTime(pos);
            }

            if (node && typeof node.duration === 'number' && Number.isFinite(node.duration) && node.duration > 0) {
              setDuration((prev) => (Math.abs(prev - node.duration) > 0.5 ? node.duration : prev));
            }
          }
        }

        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [stopProgressLoop]);

  const setupWebAudioAnalyser = useCallback((audioNode) => {
    try {
      if (typeof window === 'undefined' || !audioNode) return;

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

      if (!connectedNodesMapRef.current.has(audioNode)) {
        const source = audioCtxRef.current.createMediaElementSource(audioNode);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
        connectedNodesMapRef.current.set(audioNode, source);
      }
    } catch {
      // Fallback gracefully if MediaElementSource already bound
    }
  }, []);

  const attachNativeAudioEvents = useCallback(
    (audioNode, sound) => {
      if (!audioNode || attachedNodesSetRef.current.has(audioNode)) return;
      attachedNodesSetRef.current.add(audioNode);

      audioNode.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(audioNode.duration) && audioNode.duration > 0) {
          setDuration(audioNode.duration);
        }
      });

      audioNode.addEventListener('durationchange', () => {
        if (Number.isFinite(audioNode.duration) && audioNode.duration > 0) {
          setDuration(audioNode.duration);
        }
      });

      audioNode.addEventListener('seeking', () => {
        isSeekingRef.current = true;
      });

      audioNode.addEventListener('seeked', () => {
        isSeekingRef.current = false;
        lastSeekTimeRef.current = performance.now();
        if (typeof audioNode.currentTime === 'number' && !Number.isNaN(audioNode.currentTime)) {
          lastReportedTimeRef.current = audioNode.currentTime;
          setCurrentTime(audioNode.currentTime);
        }
        // Ensure playback and progress loop stay active after seeking if track was playing
        if (isPlayingRef.current) {
          if (audioNode.paused && sound && !sound.playing()) {
            sound.play();
          }
          startProgressLoop();
        }
      });

      audioNode.addEventListener('timeupdate', () => {
        const now = performance.now();
        if (!isSeekingRef.current && !audioNode.seeking && now - lastSeekTimeRef.current > 280) {
          const t = audioNode.currentTime;
          if (typeof t === 'number' && !Number.isNaN(t) && Math.abs(t - lastReportedTimeRef.current) >= 0.15) {
            lastReportedTimeRef.current = t;
            setCurrentTime(t);
          }
        }
      });
    },
    [startProgressLoop]
  );

  const destroyHowl = useCallback(() => {
    stopProgressLoop();
    isPlayingRef.current = false;
    isSeekingRef.current = false;
    audioNodeRef.current = null;
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
      lastReportedTimeRef.current = 0;

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
        preload: true,
        format: ['mp3', 'mpeg'],
        volume: isMuted ? 0 : volume,
        onload: () => {
          setIsLoading(false);
          const dur = sound.duration();
          if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
            setDuration(dur);
          }
        },
        onplay: (soundId) => {
          setIsLoading(false);
          setIsPlaying(true);
          isPlayingRef.current = true;

          const dur = sound.duration();
          if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
            setDuration(dur);
          }

          try {
            const html5AudioNode =
              sound._sounds?.find((s) => s._id === soundId)?._node ||
              sound._sounds?.[0]?._node;
            if (html5AudioNode) {
              audioNodeRef.current = html5AudioNode;
              attachNativeAudioEvents(html5AudioNode, sound);
              setupWebAudioAnalyser(html5AudioNode);
            }
          } catch {
            // Safe fallback
          }

          startProgressLoop();
        },
        onpause: () => {
          if (!isSeekingRef.current) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            stopProgressLoop();
          }
        },
        onstop: () => {
          setIsPlaying(false);
          isPlayingRef.current = false;
          setCurrentTime(0);
          lastReportedTimeRef.current = 0;
          stopProgressLoop();
        },
        onend: () => {
          stopProgressLoop();
          setIsPlaying(false);
          isPlayingRef.current = false;
          setCurrentTime(0);
          lastReportedTimeRef.current = 0;
          handleTrackEndedRef.current();
        },
        onseek: () => {
          if (isPlayingRef.current) {
            startProgressLoop();
          }
        },
        onloaderror: (_id, errCode) => {
          setIsLoading(false);
          setIsPlaying(false);
          isPlayingRef.current = false;
          setError(
            `Unable to load MP3 stream from Google Drive (code ${errCode}). Verify that the Google Drive file exists and has public reader permission.`
          );
        },
        onplayerror: (_id, errCode) => {
          setIsLoading(false);
          setIsPlaying(false);
          isPlayingRef.current = false;
          setError(`Audio playback interrupted (code ${errCode}). Click play to retry.`);
        },
      });

      // Set crossOrigin="anonymous" on the underlying HTML5 Audio node immediately BEFORE network fetch completes
      try {
        const initialNode = sound._sounds?.[0]?._node;
        if (initialNode) {
          initialNode.crossOrigin = 'anonymous';
          initialNode.preload = 'auto';
          audioNodeRef.current = initialNode;
          attachNativeAudioEvents(initialNode, sound);
        }
      } catch {
        // Ignore
      }

      howlRef.current = sound;
      if (autoPlay) {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
        sound.play();
      }
    },
    [
      attachNativeAudioEvents,
      destroyHowl,
      isMuted,
      setupWebAudioAnalyser,
      startProgressLoop,
      stopProgressLoop,
      volume,
    ]
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
      const targetQueue =
        Array.isArray(customQueue) && customQueue.length > 0 ? customQueue : playlist;
      const existingIdx = targetQueue.findIndex((t) => t.id === track.id);

      if (existingIdx !== -1) {
        if (customQueue) setPlaylist(targetQueue);
        if (currentIndex === existingIdx && currentTrack?.id === track.id && howlRef.current) {
          if (howlRef.current.playing()) {
            howlRef.current.pause();
          } else {
            if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
              audioCtxRef.current.resume().catch(() => {});
            }
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
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
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

  const seekTo = useCallback(
    (seconds) => {
      const howl = howlRef.current;
      if (!howl) return;
      const howlDur = howl.duration();
      const rawDur = (typeof howlDur === 'number' && howlDur > 0 ? howlDur : duration) || 0;

      const target = Math.max(
        0,
        Math.min(Number(seconds) || 0, rawDur > 0 ? Math.max(0, rawDur - 0.05) : Number(seconds) || 0)
      );

      lastSeekTimeRef.current = performance.now();
      targetSeekValueRef.current = target;
      lastReportedTimeRef.current = target;
      setCurrentTime(target);

      try {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
        howl.seek(target);
        if (isPlayingRef.current) {
          startProgressLoop();
        }
      } catch {
        // Safe fallback
      }
    },
    [duration, startProgressLoop]
  );

  const playPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    if (currentTime > 3 && howlRef.current) {
      seekTo(0);
      return;
    }
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    loadAndPlayTrack(playlist[prevIdx], true);
  }, [currentIndex, currentTime, loadAndPlayTrack, playlist, seekTo]);

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

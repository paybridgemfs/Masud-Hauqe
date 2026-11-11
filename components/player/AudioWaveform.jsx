'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

function formatSeconds(secs) {
  if (!secs || Number.isNaN(secs) || secs < 0) return '0:00';
  const total = Math.floor(secs);
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

/**
 * Generates a deterministic, realistic studio master waveform profile
 * for a given track seed (id/title) with natural musical dynamics.
 */
function buildTrackWaveformProfile(seedStr = 'masud-hauqe', barCount = 52) {
  let hash = 2166136261;
  const str = String(seedStr || 'masud-hauqe');
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const bars = [];
  for (let i = 0; i < barCount; i += 1) {
    const pos = i / (barCount - 1);
    // Natural song envelope: softer intro/outro, fuller body & chorus peaks
    const envelope =
      pos < 0.08
        ? 0.35 + (pos / 0.08) * 0.55
        : pos > 0.9
        ? 0.3 + ((1 - pos) / 0.1) * 0.6
        : 0.65 + Math.sin(pos * Math.PI) * 0.35;

    hash ^= (i + 1) * 0x9e3779b9;
    hash = Math.imul(hash, 16777619);
    const pseudo = ((hash >>> 0) % 1000) / 1000;

    const ridge = Math.abs(Math.sin(i * 0.65 + pseudo * 2.4)) * 0.35;
    const raw = (0.28 + pseudo * 0.45 + ridge) * envelope;
    const clamped = Math.max(0.18, Math.min(0.98, raw));
    bars.push(clamped);
  }
  return bars;
}

/**
 * Compact live animated spectrum bars for track artwork / active queue badge
 */
export function LiveSpectrumBadge({ isPlaying = false, className = '' }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let frameId;
    let last = performance.now();
    const tick = (now) => {
      if (now - last >= 45) {
        setPhase((p) => (p + 1) % 360);
        last = now;
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  const multipliers = [0.55, 0.95, 0.7, 1.0, 0.6];

  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-end gap-[2px] h-3.5 ${className}`}
    >
      {multipliers.map((base, idx) => {
        const dynamicHeight = isPlaying
          ? Math.max(
              22,
              Math.min(
                100,
                Math.round(
                  (base * 0.6 +
                    0.4 *
                      Math.abs(
                        Math.sin((phase * 0.14) + idx * 1.35) *
                          Math.cos((phase * 0.09) - idx * 0.8)
                      )) *
                    100
                )
              )
            )
          : 24;

        return (
          <span
            key={idx}
            className="w-[2.5px] rounded-xs bg-[#C8A464] transition-all duration-75"
            style={{ height: `${dynamicHeight}%` }}
          />
        );
      })}
    </div>
  );
}

/**
 * Interactive Studio Audio Waveform Scrubber & Live Visualizer
 */
export default function AudioWaveform({
  trackId = '',
  isPlaying = false,
  isLoading = false,
  currentTime = 0,
  duration = 0,
  onSeek,
  barCount = 52,
  heightClass = 'h-7',
}) {
  const containerRef = useRef(null);
  const [hoverRatio, setHoverRatio] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [animTick, setAnimTick] = useState(0);

  const baseBars = useMemo(
    () => buildTrackWaveformProfile(trackId, barCount),
    [trackId, barCount]
  );

  // Smooth real-time animation loop while audio is playing
  useEffect(() => {
    if (!isPlaying) return undefined;
    let rafId;
    let lastTime = performance.now();

    const animate = (now) => {
      if (now - lastTime >= 42) {
        setAnimTick((prev) => (prev + 1) % 10000);
        lastTime = now;
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  const progressRatio =
    duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;

  const calculateRatioFromClientX = useCallback((clientX) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const commitSeekRatio = useCallback(
    (ratio) => {
      if (!onSeek || duration <= 0) return;
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  useEffect(() => {
    if (!isDragging) return undefined;

    const handleWindowMouseMove = (e) => {
      const ratio = calculateRatioFromClientX(e.clientX);
      setHoverRatio(ratio);
      commitSeekRatio(ratio);
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, calculateRatioFromClientX, commitSeekRatio]);

  const handleKeyDown = (e) => {
    if (!onSeek || duration <= 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + 5));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - 5));
    }
  };

  const activeRatio = hoverRatio !== null ? hoverRatio : progressRatio;
  const playheadIndex = Math.floor(progressRatio * (barCount - 1));

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label="Audio waveform seek bar"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration || 100)}
      aria-valuenow={Math.round(currentTime || 0)}
      aria-valuetext={`${formatSeconds(currentTime)} of ${formatSeconds(duration)}`}
      onKeyDown={handleKeyDown}
      onMouseMove={(e) => {
        setHoverRatio(calculateRatioFromClientX(e.clientX));
      }}
      onMouseLeave={() => {
        if (!isDragging) setHoverRatio(null);
      }}
      onMouseDown={(e) => {
        const ratio = calculateRatioFromClientX(e.clientX);
        setIsDragging(true);
        setHoverRatio(ratio);
        commitSeekRatio(ratio);
      }}
      onTouchStart={(e) => {
        const touch = e.touches?.[0];
        if (!touch) return;
        const ratio = calculateRatioFromClientX(touch.clientX);
        commitSeekRatio(ratio);
      }}
      onTouchMove={(e) => {
        const touch = e.touches?.[0];
        if (!touch) return;
        const ratio = calculateRatioFromClientX(touch.clientX);
        commitSeekRatio(ratio);
      }}
      className={`relative flex-1 ${heightClass} flex items-center justify-between gap-[2px] sm:gap-[3px] cursor-pointer select-none group focus:outline-none`}
    >
      {/* Hover Time Tooltip */}
      {hoverRatio !== null && duration > 0 && (
        <div
          className="pointer-events-none absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#16161B] border border-[#C8A464]/40 text-[10px] font-semibold text-[#F4F1EA] tabular-nums shadow-md z-10"
          style={{ left: `${hoverRatio * 100}%` }}
        >
          {formatSeconds(hoverRatio * duration)}
        </div>
      )}

      {baseBars.map((baseAmp, index) => {
        const barRatio = index / (barCount - 1);
        const isPlayed = barRatio <= progressRatio;
        const isHoveredPreview =
          hoverRatio !== null &&
          barRatio > progressRatio &&
          barRatio <= hoverRatio;
        const isPlayhead = isPlaying && Math.abs(index - playheadIndex) <= 1;

        // Calculate live animated height when playing
        let displayAmp = baseAmp;
        if (isLoading) {
          const wave = Math.sin(index * 0.35 + animTick * 0.25) * 0.25 + 0.45;
          displayAmp = wave;
        } else if (isPlaying) {
          const distanceToPlayhead = Math.abs(index - playheadIndex);
          const energyBoost = distanceToPlayhead <= 3 ? 0.22 : 0.14;
          const harmonic =
            Math.sin(animTick * 0.18 + index * 0.75) *
            Math.cos(animTick * 0.11 - index * 0.45) *
            energyBoost;
          displayAmp = Math.max(0.16, Math.min(1, baseAmp + harmonic));
        }

        const heightPercent = Math.round(displayAmp * 100);

        let barColorClass = 'bg-[#2A2A32] group-hover:bg-[#383842]';
        if (isPlayhead) {
          barColorClass = 'bg-[#F4F1EA] shadow-[0_0_8px_rgba(200,164,100,0.85)]';
        } else if (isPlayed) {
          barColorClass =
            hoverRatio !== null && barRatio > activeRatio
              ? 'bg-[#C8A464]/65'
              : 'bg-gradient-to-t from-[#B38E4C] to-[#E2C285]';
        } else if (isHoveredPreview) {
          barColorClass = 'bg-[#C8A464]/45';
        }

        return (
          <span
            key={index}
            className={`flex-1 min-w-[2px] max-w-[4px] rounded-full transition-[height,background-color] duration-75 ${barColorClass}`}
            style={{
              height: `${heightPercent}%`,
            }}
          />
        );
      })}
    </div>
  );
}

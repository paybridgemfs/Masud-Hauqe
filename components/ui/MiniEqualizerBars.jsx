'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayer } from '@/components/player/PlayerContext.jsx';

/**
 * Live 4-bar mini audio equalizer driven by the Web Audio API AnalyserNode
 * when the track is actively playing.
 */
export default function MiniEqualizerBars({
  isPlaying = false,
  size = 'md',
  className = '',
}) {
  const { analyserRef } = usePlayer();
  const barRefs = useRef([]);

  useEffect(() => {
    let rafId = null;
    const freqBuffer = new Uint8Array(64);

    const animate = (timestamp) => {
      const bars = barRefs.current;
      if (!isPlaying) {
        for (let i = 0; i < 4; i++) {
          if (bars[i]) {
            bars[i].style.transform = 'scaleY(0.22)';
          }
        }
        return;
      }

      const analyser = analyserRef?.current;
      let hasSignal = false;

      if (analyser) {
        try {
          analyser.getByteFrequencyData(freqBuffer);
          for (let i = 2; i < 20; i++) {
            if (freqBuffer[i] > 8) {
              hasSignal = true;
              break;
            }
          }
        } catch {
          hasSignal = false;
        }
      }

      const t = timestamp * 0.0065;
      const binIndices = [2, 5, 9, 14];

      for (let i = 0; i < 4; i++) {
        const el = bars[i];
        if (!el) continue;

        let scale = 0.25;
        if (hasSignal) {
          const raw = freqBuffer[binIndices[i]] / 255;
          const organic = Math.sin(t * (1.2 + i * 0.35) + i * 1.4) * 0.08;
          scale = Math.max(0.18, Math.min(1, Math.pow(raw, 0.85) * 0.92 + organic));
        } else {
          // Smooth organic studio wave during quiet intros or before analyser attaches
          const wave1 = Math.sin(t * (1.5 + i * 0.4) + i * 1.1) * 0.32;
          const wave2 = Math.cos(t * (2.3 - i * 0.25) + i * 0.7) * 0.18;
          scale = Math.max(0.2, Math.min(0.98, 0.52 + wave1 + wave2));
        }

        el.style.transform = `scaleY(${scale.toFixed(3)})`;
      }

      rafId = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(animate);
    } else {
      animate(0);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying, analyserRef]);

  const heightClass = size === 'sm' ? 'h-3' : 'h-3.5 sm:h-4';
  const barWidthClass = size === 'sm' ? 'w-[2.5px]' : 'w-[3px]';

  return (
    <span
      className={`inline-flex items-end gap-[2.5px] ${heightClass} ${className}`}
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((idx) => (
        <span
          key={idx}
          ref={(el) => {
            barRefs.current[idx] = el;
          }}
          className={`${barWidthClass} h-full rounded-full bg-[#C8A464] origin-bottom transition-transform duration-75 will-change-transform`}
          style={{ transform: isPlaying ? 'scaleY(0.5)' : 'scaleY(0.22)' }}
        />
      ))}
    </span>
  );
}

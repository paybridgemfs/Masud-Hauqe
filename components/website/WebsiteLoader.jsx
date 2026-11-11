'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Disc3 } from 'lucide-react';

export default function WebsiteLoader({ siteName = 'Masud Hauqe' }) {
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(18);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    const minDisplayMs = 500;
    const maxTimeoutMs = 2400;

    function finishLoading() {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayMs - elapsed);
      setProgress(100);
      setTimeout(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      }, remaining + 180);
    }

    function waitForAllImagesAndDom() {
      if (cancelled) return;
      const imgs = Array.from(document.images || []);
      if (imgs.length === 0) {
        finishLoading();
        return;
      }

      let completedCount = 0;
      const total = imgs.length;

      const updateProgress = () => {
        completedCount += 1;
        const pct = Math.min(96, Math.round(35 + (completedCount / total) * 60));
        if (!cancelled) {
          setProgress((prev) => Math.max(prev, pct));
        }
        if (completedCount >= total) {
          finishLoading();
        }
      };

      imgs.forEach((img) => {
        if (img.complete) {
          updateProgress();
        } else {
          const onDone = () => {
            img.removeEventListener('load', onDone);
            img.removeEventListener('error', onDone);
            updateProgress();
          };
          img.addEventListener('load', onDone, { once: true });
          img.addEventListener('error', onDone, { once: true });
        }
      });
    }

    const fallbackTimer = setTimeout(() => {
      finishLoading();
    }, maxTimeoutMs);

    let initTimer = null;

    if (document.readyState === 'complete') {
      initTimer = setTimeout(() => {
        if (!cancelled) setProgress(45);
        waitForAllImagesAndDom();
      }, 20);
    } else {
      const onWindowLoad = () => {
        if (!cancelled) setProgress(55);
        waitForAllImagesAndDom();
      };
      window.addEventListener('load', onWindowLoad, { once: true });
      return () => {
        cancelled = true;
        clearTimeout(fallbackTimer);
        if (initTimer) clearTimeout(initTimer);
        window.removeEventListener('load', onWindowLoad);
      };
    }

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
      if (initTimer) clearTimeout(initTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isReady && (
        <motion.div
          key="website-preloader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            filter: 'blur(6px)',
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          }}
          aria-live="polite"
          aria-busy={!isReady}
          className="fixed inset-0 z-[100] bg-[#09090B] flex flex-col items-center justify-center px-6 select-none"
        >
          {/* Ambient radial glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(200,164,100,0.12)_0%,rgba(9,9,11,0)_60%)]" />

          <div className="relative z-10 flex flex-col items-center max-w-xs w-full text-center space-y-6">
            {/* Animated Sonic Disc + Wave Rings */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <motion.span
                animate={{ scale: [1, 1.32, 1], opacity: [0.35, 0.08, 0.35] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full border border-[#C8A464]/40"
              />
              <motion.span
                animate={{ scale: [1, 1.16, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                className="absolute inset-2 rounded-full border border-[#C8A464]/50"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="w-14 h-14 rounded-full bg-[#121217] border border-[#C8A464]/60 flex items-center justify-center shadow-[0_0_30px_rgba(200,164,100,0.2)]"
              >
                <Disc3 className="w-7 h-7 text-[#C8A464]" />
              </motion.div>
            </div>

            {/* Artist / Site Title & Animated Equalizer Bars */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#C8A464] uppercase">
                OFFICIAL ARCHIVE
              </p>
              <h2 className="text-xl sm:text-2xl font-bold tracking-[0.16em] text-[#F4F1EA] uppercase">
                {siteName}
              </h2>
            </div>

            {/* Smooth Shimmering Progress Bar */}
            <div className="w-full space-y-2">
              <div className="w-full h-1 rounded-full bg-[#18181F] overflow-hidden relative">
                <motion.div
                  initial={{ width: '15%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-[#8E6F36] via-[#C8A464] to-[#F4F1EA] rounded-full"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] tracking-[0.18em] text-[#8E8E96] uppercase tabular-nums">
                <span>Loading Studio Experience</span>
                <span className="text-[#C8A464] font-semibold">{progress}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

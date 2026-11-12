'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'motion/react';

/**
 * Site-wide ambient golden cursor spotlight that smoothly follows the pointer
 * across all pages, sections, and elements.
 */
export default function GlobalCursorSpotlight() {
  const [visible, setVisible] = useState(false);
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  const springX = useSpring(mouseX, { stiffness: 130, damping: 26, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 130, damping: 26, mass: 0.5 });

  const spotlightBackground = useMotionTemplate`radial-gradient(640px circle at ${springX}px ${springY}px, rgba(200, 164, 100, 0.13), rgba(200, 164, 100, 0.04) 42%, transparent 74%)`;

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const handleMouseLeaveWindow = () => {
      setVisible(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeaveWindow);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handleMouseLeaveWindow);
    };
  }, [mouseX, mouseY, visible]);

  return (
    <motion.div
      aria-hidden="true"
      style={{ background: spotlightBackground }}
      className={`pointer-events-none fixed inset-0 z-[35] transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}

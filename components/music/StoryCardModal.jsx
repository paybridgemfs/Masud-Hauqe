'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, X, Play, Music, Share2, Check } from 'lucide-react';

export default function StoryCardModal({
  isOpen,
  onClose,
  track = null,
  album = null,
  artistName = 'Masud Hauqe',
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  const title = track?.title || album?.title || 'Master Recording';
  const subtitle = track?.album?.title || (album ? `${(album.tracks || []).length} Master Tracks` : 'Official Single Master');
  const duration = track?.duration || (album ? 'Official Release' : '3:45');
  const imageUrl = track?.thumbnail || album?.coverImage || '';

  async function generateAndDownloadStory() {
    setDownloading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Canvas dimensions for vertical Instagram / Facebook story (9:16)
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      // Background Deep Obsidian Gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#0E0E12');
      bgGradient.addColorStop(0.45, '#09090B');
      bgGradient.addColorStop(1, '#050507');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Gold Ambient Glow
      const glow = ctx.createRadialGradient(width / 2, 750, 50, width / 2, 750, 700);
      glow.addColorStop(0, 'rgba(200, 164, 100, 0.22)');
      glow.addColorStop(0.6, 'rgba(200, 164, 100, 0.05)');
      glow.addColorStop(1, 'rgba(9, 9, 11, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Subtle Decorative Grid / Stars
      ctx.fillStyle = 'rgba(244, 241, 234, 0.04)';
      for (let i = 0; i < 40; i++) {
        const x = (i * 137) % width;
        const y = (i * 283) % height;
        ctx.beginPath();
        ctx.arc(x, y, (i % 3) + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Top Monograph Badge
      ctx.fillStyle = '#C8A464';
      ctx.font = 'bold 30px sans-serif';
      ctx.letterSpacing = '6px';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL MASTER RECORDING', width / 2, 220);

      ctx.fillStyle = '#F4F1EA';
      ctx.font = 'bold 52px sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText(artistName.toUpperCase(), width / 2, 300);

      // Artwork Box (Square Center)
      const artSize = 640;
      const artX = (width - artSize) / 2;
      const artY = 400;

      // Artwork Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 24;

      // Rounded rectangle clipping for artwork
      const radius = 28;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(artX + radius, artY);
      ctx.lineTo(artX + artSize - radius, artY);
      ctx.quadraticCurveTo(artX + artSize, artY, artX + artSize, artY + radius);
      ctx.lineTo(artX + artSize, artY + artSize - radius);
      ctx.quadraticCurveTo(artX + artSize, artY + artSize, artX + artSize - radius, artY + artSize);
      ctx.lineTo(artX + radius, artY + artSize);
      ctx.quadraticCurveTo(artX, artY + artSize, artX, artY + artSize - radius);
      ctx.lineTo(artX, artY + radius);
      ctx.quadraticCurveTo(artX, artY, artX + radius, artY);
      ctx.closePath();
      ctx.clip();

      if (imageUrl) {
        try {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.src = imageUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          ctx.drawImage(img, artX, artY, artSize, artSize);
        } catch {
          // Fallback artwork drawing
          ctx.fillStyle = '#17171C';
          ctx.fillRect(artX, artY, artSize, artSize);
          ctx.fillStyle = '#C8A464';
          ctx.font = 'bold 64px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('MASUD HAUQE', width / 2, artY + artSize / 2);
        }
      } else {
        ctx.fillStyle = '#17171C';
        ctx.fillRect(artX, artY, artSize, artSize);
        ctx.fillStyle = '#C8A464';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MASUD HAUQE', width / 2, artY + artSize / 2);
      }
      ctx.restore();

      // Reset Shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Artwork Golden Border Ring
      ctx.strokeStyle = 'rgba(200, 164, 100, 0.4)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Title & Artist
      ctx.fillStyle = '#F4F1EA';
      ctx.font = 'bold 60px sans-serif';
      ctx.textAlign = 'center';
      const cleanTitle = title.length > 28 ? `${title.slice(0, 26)}...` : title;
      ctx.fillText(cleanTitle, width / 2, 1140);

      ctx.fillStyle = '#C8A464';
      ctx.font = '500 36px sans-serif';
      ctx.fillText(artistName, width / 2, 1205);

      if (subtitle) {
        ctx.fillStyle = '#8E8E96';
        ctx.font = '400 30px sans-serif';
        ctx.fillText(subtitle, width / 2, 1260);
      }

      // Audio Player Progress Visual Bar
      const barY = 1360;
      const barWidth = 720;
      const barX = (width - barWidth) / 2;
      const barHeight = 10;

      // Base bar
      ctx.fillStyle = '#26262E';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 5);
      ctx.fill();

      // Played portion (Gold)
      const playedWidth = barWidth * 0.62;
      const goldGrad = ctx.createLinearGradient(barX, 0, barX + playedWidth, 0);
      goldGrad.addColorStop(0, '#8E6F36');
      goldGrad.addColorStop(1, '#C8A464');
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, playedWidth, barHeight, 5);
      ctx.fill();

      // Playhead circle
      ctx.fillStyle = '#F4F1EA';
      ctx.beginPath();
      ctx.arc(barX + playedWidth, barY + barHeight / 2, 12, 0, Math.PI * 2);
      ctx.fill();

      // Timestamps
      ctx.fillStyle = '#8E8E96';
      ctx.font = '400 24px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('1:42', barX, barY + 45);
      ctx.textAlign = 'right';
      ctx.fillText(duration, barX + barWidth, barY + 45);

      // Play Controls Icon Preview
      ctx.fillStyle = '#C8A464';
      ctx.beginPath();
      ctx.arc(width / 2, 1500, 48, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#09090B';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 12, 1500 - 20);
      ctx.lineTo(width / 2 + 20, 1500);
      ctx.lineTo(width / 2 - 12, 1500 + 20);
      ctx.closePath();
      ctx.fill();

      // Bottom Footer CTA
      ctx.fillStyle = '#8E8E96';
      ctx.font = '400 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NOW STREAMING IN STUDIO MASTER AUDIO', width / 2, 1680);

      ctx.fillStyle = '#C8A464';
      ctx.font = 'bold 32px sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('LISTEN AT MASUDHAUQE.COM', width / 2, 1740);

      // Trigger automatic PNG download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-story-card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Story card generation error:', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative max-w-sm w-full bg-[#111115] border border-[#26262E] rounded-xl overflow-hidden shadow-2xl p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1E1E24]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#C8A464]">
              <Sparkles className="w-4 h-4" />
              <span>STORY CARD EXPORTER</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#8E8E96] hover:text-[#F4F1EA] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Live Mobile Story Card Preview Frame */}
          <div className="relative aspect-[9/16] max-h-[380px] mx-auto rounded-lg overflow-hidden border border-[#C8A464]/30 bg-gradient-to-b from-[#17171C] via-[#09090B] to-[#050507] p-4 flex flex-col justify-between text-center shadow-lg select-none">
            {/* Top Monograph */}
            <div>
              <p className="text-[8px] font-semibold tracking-[0.2em] text-[#C8A464] uppercase">
                MASTER RECORDING
              </p>
              <p className="text-xs font-bold tracking-[0.14em] text-[#F4F1EA] uppercase mt-0.5">
                {artistName}
              </p>
            </div>

            {/* Artwork */}
            <div className="w-36 h-36 mx-auto rounded-md overflow-hidden bg-[#16161B] border border-[#C8A464]/40 relative shadow-md">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  sizes="144px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-8 h-8 text-[#C8A464]" />
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#F4F1EA] truncate">{title}</p>
              <p className="text-[10px] text-[#C8A464]">{artistName}</p>
              {subtitle && <p className="text-[9px] text-[#8E8E96] truncate">{subtitle}</p>}

              {/* Fake progress bar */}
              <div className="pt-2 max-w-[180px] mx-auto space-y-1">
                <div className="w-full h-1 bg-[#222228] rounded-full overflow-hidden">
                  <div className="w-3/5 h-full bg-[#C8A464] rounded-full" />
                </div>
                <div className="flex justify-between text-[8px] text-[#8E8E96] font-mono">
                  <span>1:42</span>
                  <span>{duration}</span>
                </div>
              </div>

              <div className="w-7 h-7 mx-auto rounded-full bg-[#C8A464] text-[#09090B] flex items-center justify-center mt-2 shadow">
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="pt-2 border-t border-white/5">
              <p className="text-[8px] tracking-widest text-[#C8A464] font-bold">
                LISTEN AT MASUDHAUQE.COM
              </p>
            </div>
          </div>

          <p className="text-[11px] text-[#8E8E96] text-center leading-relaxed">
            Exports a high-resolution 1080×1920 PNG perfectly formatted for Instagram & Facebook Stories.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={generateAndDownloadStory}
              disabled={downloading}
              className="flex-1 py-2.5 px-4 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#166534]" />
                  <span>Story Card Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Rendering HD Card...' : 'Download Story Card (PNG)'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3 rounded bg-[#18181D] hover:bg-[#222228] text-xs font-medium text-[#D4D4D8] transition-colors"
            >
              Close
            </button>
          </div>

          {/* Hidden off-screen canvas used for drawing high-resolution story card */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from 'motion/react';
import {
  ArrowRight,
  Play,
  Pause,
  Loader2,
  Mail,
  Music,
  Disc,
  PlayCircle,
  Image as ImageIcon,
  Share2,
  Headphones,
  Award,
  Briefcase,
} from 'lucide-react';
import MusicCard from '@/components/music/MusicCard.jsx';
import AlbumCard from '@/components/music/AlbumCard.jsx';
import SocialMediaLinks from '@/components/website/SocialMediaLinks.jsx';
import { usePlayer } from '@/components/player/PlayerContext.jsx';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.085,
      delayChildren: 0.04,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
  },
};

function buildFourGridItems(rawItems, { publishedMusic = [], publishedAlbums = [] }) {
  const videoCount = publishedMusic.filter(
    (m) => Boolean(m.youtubeVideoId && m.includeYoutubeVideo)
  ).length;

  const defaults = [
    {
      kicker: 'MASTER REPERTOIRE',
      title: `${publishedMusic.length} ${publishedMusic.length === 1 ? 'Track' : 'Tracks'}`,
      subtitle: 'Authorized studio recordings & stream',
      url: '/music',
      Icon: Music,
    },
    {
      kicker: 'OFFICIAL DISCOGRAPHY',
      title: `${publishedAlbums.length} ${publishedAlbums.length === 1 ? 'Release' : 'Releases'}`,
      subtitle: 'Curated albums, EPs & collections',
      url: '/releases',
      Icon: Disc,
    },
    {
      kicker: 'VISUAL SESSIONS',
      title: `${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}`,
      subtitle: 'Official YouTube performances',
      url: '/videos',
      Icon: PlayCircle,
    },
    {
      kicker: 'STUDIO FIDELITY',
      title: '320kbps MP3',
      subtitle: 'High-resolution direct audio archive',
      url: '/about',
      Icon: Headphones,
    },
  ];

  const customList = Array.isArray(rawItems) ? rawItems : [];
  return defaults.map((def, idx) => {
    const item = customList[idx] || {};
    return {
      kicker: item.kicker && item.kicker.trim() ? item.kicker.trim() : def.kicker,
      title: item.title && item.title.trim() ? item.title.trim() : def.title,
      subtitle: item.subtitle && item.subtitle.trim() ? item.subtitle.trim() : def.subtitle,
      url: item.url !== undefined ? item.url.trim() : def.url,
      Icon: def.Icon,
    };
  });
}

function HeroSpotlightSection({
  content,
  artist,
  publishedMusic,
  publishedAlbums,
  playTrack,
  currentTrack,
  isPlaying,
  isLoading,
}) {
  const sectionRef = useRef(null);

  // Scroll Parallax for Hero background and portrait
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const bgScrollY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const portraitScrollY = useTransform(scrollYProgress, [0, 1], [0, -24]);

  // Cursor Spotlight & Mouse Parallax
  const mouseX = useMotionValue(600);
  const mouseY = useMotionValue(320);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 24 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 24 });
  const smoothNormX = useSpring(normX, { stiffness: 90, damping: 22 });
  const smoothNormY = useSpring(normY, { stiffness: 90, damping: 22 });

  const bgParallaxX = useTransform(smoothNormX, [-0.5, 0.5], [12, -12]);
  const bgParallaxY = useTransform(smoothNormY, [-0.5, 0.5], [10, -10]);
  const portraitParallaxX = useTransform(smoothNormX, [-0.5, 0.5], [-10, 10]);
  const portraitParallaxY = useTransform(smoothNormY, [-0.5, 0.5], [-8, 8]);

  const spotlightBg = useMotionTemplate`radial-gradient(620px circle at ${springX}px ${springY}px, rgba(200, 164, 100, 0.14), rgba(200, 164, 100, 0.03) 45%, transparent 75%)`;

  function handleMouseMove(e) {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX.set(x);
    mouseY.set(y);
    normX.set(x / Math.max(rect.width, 1) - 0.5);
    normY.set(y / Math.max(rect.height, 1) - 0.5);
  }

  function handleMouseLeave() {
    normX.set(0);
    normY.set(0);
  }

  const latestTrack = publishedMusic[0] || null;
  const heroBgImage = content.backgroundImage || artist?.coverImage || '';
  const portraitImage = artist?.profileImage || '';
  const headline = content.headline || content.heading || artist?.name || 'Masud Hauqe';
  const subheadline =
    content.subheadline ||
    content.subheading ||
    artist?.shortBiography ||
    artist?.biography ||
    'Official musical archive, original studio recordings, and authorized audio releases.';

  const showLatestPlay = content.showLatestPlayButton !== false;
  const latestPlayText = content.latestPlayButtonText || 'Play Latest Release';
  const primaryCtaText = content.primaryCtaText !== undefined ? content.primaryCtaText : 'Listen to Archive';
  const primaryCtaUrl = content.primaryCtaUrl || '/music';
  const secondaryCtaText = content.secondaryCtaText !== undefined ? content.secondaryCtaText : 'Artist Monograph';
  const secondaryCtaUrl = content.secondaryCtaUrl || '/about';
  const showHeroGrid = content.showHeroGrid !== false;
  const heroGridItems = buildFourGridItems(content.heroGridItems, {
    publishedMusic,
    publishedAlbums,
  });

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative border-b border-[#222226] overflow-hidden bg-[#09090B]"
    >
      {/* Hero Background Image with Smooth Parallax Depth */}
      {heroBgImage && (
        <motion.div
          style={{ x: bgParallaxX, y: bgScrollY, scale: 1.06 }}
          className="absolute inset-0 z-0 pointer-events-none will-change-transform"
        >
          <motion.div style={{ y: bgParallaxY }} className="relative w-full h-full">
            <ShimmerImage
              src={heroBgImage}
              alt={headline}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
          <div className="absolute inset-0 z-[2] bg-black/75" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/50" />
        </motion.div>
      )}

      {/* Subtle Ambient Golden Cursor Spotlight */}
      <motion.div
        style={{ background: spotlightBg }}
        className="pointer-events-none absolute inset-0 z-[3] transition-opacity duration-300"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-[40px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: Staggered Headline & Actions Reveal */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className={`${
              portraitImage ? 'lg:col-span-7' : 'lg:col-span-12'
            } flex flex-col justify-center items-center text-center lg:items-start lg:text-left space-y-6`}
          >
            {content.kicker && (
              <motion.p
                variants={staggerItem}
                className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]"
              >
                {content.kicker}
              </motion.p>
            )}

            {headline && (
              <motion.h1
                variants={staggerItem}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F4F1EA] leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                {headline}
              </motion.h1>
            )}

            {subheadline && (
              <motion.p
                variants={staggerItem}
                className="text-base sm:text-lg text-[#D4D4D8] max-w-2xl mx-auto lg:mx-0 leading-relaxed"
              >
                {subheadline}
              </motion.p>
            )}

            <motion.div
              variants={staggerItem}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2 w-full"
            >
              {latestTrack && showLatestPlay && (
                <button
                  type="button"
                  disabled={currentTrack?.id === latestTrack.id && isLoading}
                  onClick={() => playTrack(latestTrack, publishedMusic)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0 shadow-md disabled:opacity-75 disabled:cursor-wait"
                >
                  {currentTrack?.id === latestTrack.id && isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : currentTrack?.id === latestTrack.id && isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause Latest Release</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>{latestPlayText}</span>
                    </>
                  )}
                </button>
              )}

              {primaryCtaText && (
                <Link
                  href={primaryCtaUrl}
                  className="px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0 shadow-md"
                >
                  {primaryCtaText}
                </Link>
              )}

              {secondaryCtaText && (
                <Link
                  href={secondaryCtaUrl}
                  className="px-6 py-3 rounded border border-[#32323C] bg-[#09090B]/60 backdrop-blur-sm text-[#F4F1EA] hover:border-[#C8A464] hover:text-[#C8A464] text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0"
                >
                  {secondaryCtaText}
                </Link>
              )}
            </motion.div>
          </motion.div>

          {/* Right Column: Editorial Portrait Card with Subtle Parallax Depth */}
          {portraitImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.58, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              style={{ y: portraitScrollY }}
              className="lg:col-span-5 flex justify-center lg:justify-end"
            >
              <motion.div
                style={{ x: portraitParallaxX, y: portraitParallaxY }}
                className="w-full max-w-[290px] sm:max-w-[320px] md:max-w-[340px] lg:max-w-[310px] xl:max-w-[330px] aspect-[3/4] min-h-[370px] sm:min-h-[400px] lg:min-h-[380px] xl:min-h-[410px] rounded-xl bg-[#111116]/90 border border-[#24242C] hover:border-[#C8A464]/50 overflow-hidden relative flex flex-col justify-end p-5 sm:p-6 shadow-2xl transition-colors duration-300 will-change-transform"
              >
                <ShimmerImage
                  src={portraitImage}
                  alt={headline}
                  fill
                  sizes="(max-width: 1024px) 340px, 340px"
                  className="object-cover object-top"
                />
                <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="relative z-10 border-t border-white/15 pt-4 flex items-center justify-between text-xs text-[#D4D4D8]">
                  <div>
                    {artist?.name && (
                      <p className="font-semibold text-[#F4F1EA]">{artist.name}</p>
                    )}
                    {artist?.location && (
                      <p className="text-[#A1A1AA]">{artist.location}</p>
                    )}
                  </div>
                  <div className="text-right tabular-nums text-[#D4D4D8]">
                    {publishedMusic.length > 0 && <span>{publishedMusic.length} Works</span>}
                    {publishedMusic.length > 0 && publishedAlbums.length > 0 && (
                      <span aria-hidden="true"> · </span>
                    )}
                    {publishedAlbums.length > 0 && (
                      <span>{publishedAlbums.length} Releases</span>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* 4-Column Highlights Grid Below Hero Banner with Staggered Cascade Reveal */}
        {showHeroGrid && (
          <div className="pt-8 sm:pt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {heroGridItems.map((item, idx) => {
              const IconComponent = item.Icon;
              const cardInner = (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ y: -4 }}
                  transition={{
                    duration: 0.48,
                    delay: 0.22 + idx * 0.075,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="h-full rounded-xl bg-[#111116]/85 backdrop-blur-md border border-[#24242E] hover:border-[#C8A464]/50 p-4 sm:p-5 transition-colors duration-300 flex flex-col justify-between group shadow-lg"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8A464] truncate">
                      {item.kicker}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#181820] border border-[#2A2A36] flex items-center justify-center text-[#C8A464] shrink-0 group-hover:bg-[#C8A464] group-hover:text-[#09090B] transition-colors">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg sm:text-2xl font-bold text-[#F4F1EA] tracking-tight tabular-nums">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#9A9AA2] mt-1 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </motion.div>
              );

              return item.url ? (
                <Link key={idx} href={item.url} className="block h-full">
                  {cardInner}
                </Link>
              ) : (
                <div key={idx} className="h-full">
                  {cardInner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function SectionRenderer({
  section,
  artist,
  publishedMusic = [],
  popularMusic = [],
  publishedAlbums = [],
  gallery = [],
  socialLinks = [],
  settings = {},
}) {
  const { playTrack, currentTrack, isPlaying, isLoading } = usePlayer();
  if (!section || !section.isVisible) return null;

  const content = section.content || {};
  const type = section.type;

  switch (type) {
    case 'HERO': {
      return (
        <HeroSpotlightSection
          content={content}
          artist={artist}
          publishedMusic={publishedMusic}
          publishedAlbums={publishedAlbums}
          playTrack={playTrack}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          isLoading={isLoading}
        />
      );
    }

    case 'HIGHLIGHTS_GRID': {
      const gridItems = buildFourGridItems(content.heroGridItems, {
        publishedMusic,
        publishedAlbums,
      });

      return (
        <section className="border-b border-[#222226] py-12 sm:py-16 bg-[#0B0B0E]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {(content.kicker || content.heading || content.subheading) && (
              <motion.div {...fadeUp} className="mb-8">
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] mb-1.5">
                    {content.kicker}
                  </p>
                )}
                {content.heading && (
                  <h2 className="text-xl sm:text-2xl font-bold text-[#F4F1EA]">
                    {content.heading}
                  </h2>
                )}
                {content.subheading && (
                  <p className="text-sm text-[#9A9AA2] mt-1 max-w-2xl">{content.subheading}</p>
                )}
              </motion.div>
            )}

            <motion.div
              {...fadeUp}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
            >
              {gridItems.map((item, idx) => {
                const IconComponent = item.Icon;
                const cardInner = (
                  <div className="h-full rounded-xl bg-[#111116] border border-[#24242E] hover:border-[#C8A464]/50 p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between group shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C8A464] truncate">
                        {item.kicker}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#181820] border border-[#2A2A36] flex items-center justify-center text-[#C8A464] shrink-0 group-hover:bg-[#C8A464] group-hover:text-[#09090B] transition-colors">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg sm:text-2xl font-bold text-[#F4F1EA] tracking-tight tabular-nums">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#9A9AA2] mt-1 line-clamp-2 leading-relaxed">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                );

                return item.url ? (
                  <Link key={idx} href={item.url} className="block h-full">
                    {cardInner}
                  </Link>
                ) : (
                  <div key={idx} className="h-full">
                    {cardInner}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>
      );
    }

    case 'FEATURED_MUSIC':
    case 'LATEST_RELEASES':
    case 'POPULAR_MUSIC': {
      const displayLimit = Number(content.limit) > 0 ? Number(content.limit) : 8;
      const singlePublishedMusic = publishedMusic.filter((m) => !m.albumId);
      const singlePopularMusic = popularMusic.filter((m) => !m.albumId);
      const tracksToShow =
        type === 'POPULAR_MUSIC'
          ? singlePopularMusic.slice(0, displayLimit)
          : singlePublishedMusic.slice(0, displayLimit);

      const ctaText = content.ctaText !== undefined ? content.ctaText : 'Open Full Music Library';
      const ctaUrl = content.ctaUrl || '/music';
      const showCta = content.showCtaButton !== false && Boolean(ctaText);

      return (
        <section className="border-b border-[#222226] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...fadeUp}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
            >
              <div>
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] mb-2">
                    {content.kicker}
                  </p>
                )}
                {(content.heading || section.name) && (
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
                    {content.heading || section.name}
                  </h2>
                )}
                {content.subheading && (
                  <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">{content.subheading}</p>
                )}
              </div>
              {showCta && (
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C8A464] hover:text-[#D4B475] transition-colors whitespace-nowrap shrink-0 group"
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </motion.div>

            {tracksToShow.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
                {tracksToShow.map((track, idx) => (
                  <MusicCard key={track.id} track={track} queue={tracksToShow} index={idx} />
                ))}
              </div>
            ) : (
              <div className="bg-[#111115] border border-[#222228] rounded-xl p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#18181F] border border-[#2E2E38] mx-auto flex items-center justify-center text-[#C8A464]">
                  <Music className="w-5 h-5" />
                </div>
                <p className="text-sm sm:text-base text-[#F4F1EA] font-semibold">
                  {content.emptyHeading || 'No Tracks Published Yet'}
                </p>
                <p className="text-xs sm:text-sm text-[#8E8E96] max-w-md mx-auto">
                  {content.emptyText ||
                    'Published audio recordings from the library will appear here automatically.'}
                </p>
                {showCta && (
                  <div className="pt-2">
                    <Link
                      href={ctaUrl}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold tracking-wide transition-colors"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'ALBUMS': {
      const displayLimit = Number(content.limit) > 0 ? Number(content.limit) : 12;
      const cleanHeading = content.heading || section.name || 'Official Releases & Collections';
      const ctaText = content.ctaText !== undefined ? content.ctaText : 'View All Releases';
      const ctaUrl = content.ctaUrl || '/releases';
      const showCta = content.showCtaButton !== false && Boolean(ctaText);

      return (
        <section className="border-b border-[#222226] py-16 sm:py-20 bg-[#0B0B0E]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...fadeUp}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
            >
              <div>
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] mb-2">
                    {content.kicker}
                  </p>
                )}
                {cleanHeading && (
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
                    {cleanHeading}
                  </h2>
                )}
                {content.subheading && (
                  <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">{content.subheading}</p>
                )}
              </div>
              {showCta && (
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C8A464] hover:text-[#D4B475] transition-colors whitespace-nowrap shrink-0 group"
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </motion.div>

            {publishedAlbums.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                {publishedAlbums.slice(0, displayLimit).map((album, idx) => (
                  <AlbumCard key={album.id} album={album} index={idx} />
                ))}
              </div>
            ) : (
              <div className="bg-[#111115] border border-[#222228] rounded-xl p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#18181F] border border-[#2E2E38] mx-auto flex items-center justify-center text-[#C8A464]">
                  <Disc className="w-5 h-5" />
                </div>
                <p className="text-sm sm:text-base text-[#F4F1EA] font-semibold">
                  {content.emptyHeading || 'No Official Releases Yet'}
                </p>
                <p className="text-xs sm:text-sm text-[#8E8E96] max-w-md mx-auto">
                  {content.emptyText ||
                    'Curated albums, EPs, and discography collections will appear here once published.'}
                </p>
                {showCta && (
                  <div className="pt-2">
                    <Link
                      href={ctaUrl}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold tracking-wide transition-colors"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'ARTIST_INTRO':
    case 'BIOGRAPHY_PREVIEW': {
      const bioText =
        content.body ||
        artist?.biography ||
        artist?.shortBiography ||
        'Masud Hauqe is an independent recording artist and composer whose work explores atmospheric arrangements, vocal resonance, and timeless acoustic production.';
      const ctaText = content.ctaText !== undefined ? content.ctaText : 'Read Full Biography';
      const ctaUrl = content.ctaUrl || '/about';
      const showCta = content.showCtaButton !== false && Boolean(ctaText);

      return (
        <section className="border-b border-[#222226] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...fadeUp}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
            >
              <div className="lg:col-span-5">
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] mb-2">
                    {content.kicker}
                  </p>
                )}
                {(content.heading || artist?.name) && (
                  <h2
                    className="text-2xl sm:text-3xl font-bold text-[#F4F1EA] leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    {content.heading || (artist?.name ? `About ${artist.name}` : 'Artist Monograph')}
                  </h2>
                )}
                {(content.subheading || artist?.careerInfo) && (
                  <p className="text-sm text-[#9A9AA2] mt-3 leading-relaxed">
                    {content.subheading || artist?.careerInfo}
                  </p>
                )}
              </div>

              <div className="lg:col-span-7 space-y-5 bg-[#111115] border border-[#222228] rounded-lg p-6 sm:p-8 shadow-lg">
                <p className="text-base text-[#E4E4E7] leading-relaxed whitespace-pre-line">
                  {bioText}
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-[#1E1E24]">
                  {artist?.name && (
                    <span className="text-xs text-[#8E8E96]">
                      {artist.name}
                    </span>
                  )}
                  {showCta && (
                    <Link
                      href={ctaUrl}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C8A464] hover:text-[#D4B475] transition-colors group ml-auto"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      );
    }

    case 'ARTIST_CAREER': {
      const careerText = (content.careerBody || artist?.careerInfo || '').trim();
      const musicalBgText = (content.musicalBgBody || artist?.musicalBg || '').trim();
      const showAchievements = content.showAchievements !== false;
      const achievements = Array.isArray(artist?.achievements) ? artist.achievements : [];
      const hasAnyCareerContent =
        Boolean(careerText) ||
        Boolean(musicalBgText) ||
        (showAchievements && achievements.length > 0);

      const ctaText = content.ctaText !== undefined ? content.ctaText : 'Explore Full Monograph';
      const ctaUrl = content.ctaUrl || '/about';
      const showCta = content.showCtaButton !== false && Boolean(ctaText);

      return (
        <section className="border-b border-[#222226] py-16 sm:py-20 bg-[#0B0B0E]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <motion.div
              {...fadeUp}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
            >
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] mb-2">
                  {content.kicker || 'CAREER & MILESTONES'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
                  {content.heading || section.name || 'Career Overview & Musical Journey'}
                </h2>
                {content.subheading && (
                  <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">{content.subheading}</p>
                )}
              </div>

              {showCta && (
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C8A464] hover:text-[#D4B475] transition-colors whitespace-nowrap shrink-0 group"
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </motion.div>

            {hasAnyCareerContent ? (
              <div className="space-y-8">
                {(careerText || musicalBgText) && (
                  <div
                    className={`grid grid-cols-1 ${
                      careerText && musicalBgText ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
                    } gap-6`}
                  >
                    {careerText && (
                      <motion.div
                        {...fadeUp}
                        className="bg-[#111115] border border-[#222228] hover:border-[#C8A464]/40 rounded-xl p-6 sm:p-8 space-y-3 shadow-lg transition-colors"
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
                          <Briefcase className="w-4 h-4" />
                          <span>CAREER INFORMATION</span>
                        </div>
                        <p className="text-sm sm:text-base text-[#E4E4E7] leading-relaxed whitespace-pre-line">
                          {careerText}
                        </p>
                      </motion.div>
                    )}

                    {musicalBgText && (
                      <motion.div
                        {...fadeUp}
                        className="bg-[#111115] border border-[#222228] hover:border-[#C8A464]/40 rounded-xl p-6 sm:p-8 space-y-3 shadow-lg transition-colors"
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
                          <Music className="w-4 h-4" />
                          <span>MUSICAL BACKGROUND</span>
                        </div>
                        <p className="text-sm sm:text-base text-[#E4E4E7] leading-relaxed whitespace-pre-line">
                          {musicalBgText}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                {showAchievements && achievements.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] uppercase">
                      Key Career Achievements & Recognition
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {achievements.map((ach, idx) => (
                        <motion.div
                          key={ach.id || idx}
                          initial={{ opacity: 0, y: 18 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: '-20px' }}
                          whileHover={{ y: -4 }}
                          transition={{
                            duration: 0.42,
                            delay: Math.min(idx * 0.06, 0.3),
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="bg-[#111115] border border-[#222228] hover:border-[#C8A464]/50 rounded-xl p-5 sm:p-6 space-y-2.5 shadow-md transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs text-[#C8A464] tabular-nums">
                            <Award className="w-4 h-4" />
                            {ach.year && <span className="font-mono font-semibold">{ach.year}</span>}
                          </div>
                          {ach.title && (
                            <h3 className="text-base font-bold text-[#F4F1EA]">{ach.title}</h3>
                          )}
                          {ach.description && (
                            <p className="text-xs sm:text-sm text-[#9A9AA2] leading-relaxed">
                              {ach.description}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#111115] border border-[#222228] rounded-xl p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#18181F] border border-[#2E2E38] mx-auto flex items-center justify-center text-[#C8A464]">
                  <Award className="w-5 h-5" />
                </div>
                <p className="text-sm sm:text-base text-[#F4F1EA] font-semibold">
                  {content.emptyHeading || 'Career & Milestones Not Added Yet'}
                </p>
                <p className="text-xs sm:text-sm text-[#8E8E96] max-w-md mx-auto">
                  {content.emptyText ||
                    'Add Career Information, Musical Background, or Achievements in Artist Management (or customize this section) to display them here.'}
                </p>
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'MUSIC_VIDEOS': {
      const displayLimit = Number(content.limit) > 0 ? Number(content.limit) : 6;
      const videoTracks = publishedMusic.filter(
        (m) => Boolean(m.youtubeVideoId && m.includeYoutubeVideo)
      );
      const ctaText = content.ctaText !== undefined ? content.ctaText : 'Open Video Gallery';
      const ctaUrl = content.ctaUrl || '/videos';
      const showCta = content.showCtaButton !== false && Boolean(ctaText);

      return (
        <section className="border-b border-[#222226] py-16 sm:py-20 bg-[#0B0B0E]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...fadeUp}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
            >
              <div>
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] mb-2">
                    {content.kicker}
                  </p>
                )}
                {(content.heading || section.name) && (
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
                    {content.heading || section.name}
                  </h2>
                )}
                {content.subheading && (
                  <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">{content.subheading}</p>
                )}
              </div>
              {showCta && (
                <Link
                  href={ctaUrl}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C8A464] hover:text-[#D4B475] transition-colors whitespace-nowrap shrink-0 group"
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </motion.div>

            {videoTracks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
                {videoTracks.slice(0, displayLimit).map((track, idx) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.25) }}
                    className="bg-[#111115] border border-[#222228] hover:border-[#C8A464]/50 rounded-lg overflow-hidden flex flex-col transition-colors shadow-sm hover:shadow-xl"
                  >
                    <div className="aspect-video bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${track.youtubeVideoId}`}
                        title={track.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="p-2.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 flex-1">
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-base font-semibold text-[#F4F1EA] leading-snug line-clamp-2 sm:truncate">
                          {track.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-[#8E8E96] mt-0.5 truncate">
                          {track.artist?.name ? `${track.artist.name} · ` : ''}
                          {track.duration || ''}
                        </p>
                      </div>
                      <Link
                        href={`/music/${track.slug}`}
                        className="text-[10px] sm:text-xs font-semibold text-[#C8A464] hover:underline shrink-0 self-start sm:self-auto"
                      >
                        Audio Master →
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-[#111115] border border-[#222228] rounded-xl p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#18181F] border border-[#2E2E38] mx-auto flex items-center justify-center text-[#C8A464]">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <p className="text-sm sm:text-base text-[#F4F1EA] font-semibold">
                  {content.emptyHeading || 'No Music Videos Linked Yet'}
                </p>
                <p className="text-xs sm:text-sm text-[#8E8E96] max-w-md mx-auto">
                  {content.emptyText ||
                    'YouTube video performances linked to published music tracks will appear here.'}
                </p>
                {showCta && (
                  <div className="pt-2">
                    <Link
                      href={ctaUrl}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold tracking-wide transition-colors"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'GALLERY': {
      const displayLimit = Number(content.limit) > 0 ? Number(content.limit) : 6;
      const ctaText = content.ctaText !== undefined ? content.ctaText : 'Full Gallery →';
      const ctaUrl = content.ctaUrl || '/gallery';
      const showCta = content.showCtaButton !== false && Boolean(ctaText);

      return (
        <section className="border-b border-[#222226] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="flex items-end justify-between gap-4 mb-10">
              <div>
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464] mb-2">
                    {content.kicker}
                  </p>
                )}
                {(content.heading || section.name) && (
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
                    {content.heading || section.name}
                  </h2>
                )}
                {content.subheading && (
                  <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">{content.subheading}</p>
                )}
              </div>
              {showCta && (
                <Link
                  href={ctaUrl}
                  className="text-sm font-semibold text-[#C8A464] hover:underline"
                >
                  {ctaText}
                </Link>
              )}
            </motion.div>

            {gallery.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gallery.slice(0, displayLimit).map((item, idx) => (
                  <motion.figure
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-20px' }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.25) }}
                    className="group bg-[#111115] border border-[#222228] hover:border-[#C8A464]/50 rounded-lg overflow-hidden transition-colors shadow-sm hover:shadow-xl"
                  >
                    <div className="relative aspect-[4/3] bg-[#16161B] overflow-hidden">
                      <ShimmerImage
                        src={item.imageUrl}
                        alt={item.title || ''}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
                      />
                    </div>
                    {item.title && (
                      <figcaption className="p-4">
                        <p className="text-sm font-semibold text-[#F4F1EA]">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-[#8E8E96] mt-1">{item.description}</p>
                        )}
                      </figcaption>
                    )}
                  </motion.figure>
                ))}
              </div>
            ) : (
              <div className="bg-[#111115] border border-[#222228] rounded-xl p-8 sm:p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#18181F] border border-[#2E2E38] mx-auto flex items-center justify-center text-[#C8A464]">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-sm sm:text-base text-[#F4F1EA] font-semibold">
                  {content.emptyHeading || 'No Gallery Items Yet'}
                </p>
                <p className="text-xs sm:text-sm text-[#8E8E96] max-w-md mx-auto">
                  {content.emptyText ||
                    'Visual artwork and photography curated in the Admin Gallery will be shown here.'}
                </p>
                {showCta && (
                  <div className="pt-2">
                    <Link
                      href={ctaUrl}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold tracking-wide transition-colors"
                    >
                      <span>{ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'SOCIAL_LINKS': {
      const heading =
        content.heading || (artist?.name ? `Connect with ${artist.name}` : 'Official Social Channels');

      return (
        <section className="border-b border-[#222226] py-12">
          <motion.div
            {...fadeUp}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-[#F4F1EA]">{heading}</h2>
              {content.subheading && (
                <p className="text-xs text-[#8E8E96] mt-1">{content.subheading}</p>
              )}
            </div>
            {socialLinks.length > 0 ? (
              <SocialMediaLinks socialLinks={socialLinks} variant="buttons" />
            ) : (
              <div className="text-xs text-[#71717A] flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#C8A464]" />
                <span>Add social profile links in the Admin CMS to display them here.</span>
              </div>
            )}
          </motion.div>
        </section>
      );
    }

    case 'CONTACT_SECTION':
    default: {
      const heading = content.heading || section.name || 'Management, Licensing & Press Inquiries';
      const subheading =
        content.subheading ||
        'Connect directly with the management desk for performance bookings, sync licensing, or press requests.';
      const ctaText = content.ctaText !== undefined ? content.ctaText : 'Open Inquiry Desk';
      const ctaUrl = content.ctaUrl || '/contact';
      const showCta = content.showCtaButton !== false && Boolean(ctaText);
      const showEmail = content.showEmailButton !== false;

      return (
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...fadeUp}
              className="bg-[#111115] border border-[#24242C] rounded-lg p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-xl"
            >
              <div className="max-w-2xl space-y-2">
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
                    {content.kicker}
                  </p>
                )}
                {heading && (
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F1EA]">
                    {heading}
                  </h2>
                )}
                {subheading && (
                  <p className="text-sm sm:text-base text-[#9A9AA2] leading-relaxed">
                    {subheading}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3.5 shrink-0">
                {showCta && (
                  <Link
                    href={ctaUrl}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shadow-md"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{ctaText}</span>
                  </Link>
                )}
                {showEmail && settings.contactEmail && (
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="px-5 py-3 rounded border border-[#2E2E38] hover:border-[#C8A464] text-xs font-medium text-[#D4D4D8] hover:text-[#F4F1EA] transition-colors"
                  >
                    {settings.contactEmail}
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      );
    }
  }
}

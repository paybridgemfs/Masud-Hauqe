'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Play,
  Mail,
  Music,
  Disc,
  PlayCircle,
  Image as ImageIcon,
  Share2,
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
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

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
  const { playTrack } = usePlayer();
  if (!section || !section.isVisible) return null;

  const content = section.content || {};
  const type = section.type;

  switch (type) {
    case 'HERO': {
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

      return (
        <section className="relative border-b border-[#222226] overflow-hidden bg-[#09090B]">
          {/* Hero Background Image */}
          {heroBgImage && (
            <div className="absolute inset-0 z-0 pointer-events-none">
              <ShimmerImage
                src={heroBgImage}
                alt={headline}
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 z-[2] bg-black/75" />
              <div className="absolute inset-0 z-[2] bg-gradient-to-r from-[#09090B]/95 via-[#09090B]/80 to-[#09090B]/65" />
              <div className="absolute inset-0 z-[2] bg-gradient-to-t from-[#09090B] via-transparent to-[#09090B]/50" />
            </div>
          )}

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              {/* Left Column: Headline and actions */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={`${
                  portraitImage ? 'lg:col-span-7' : 'lg:col-span-12'
                } flex flex-col justify-center items-center text-center lg:items-start lg:text-left space-y-6`}
              >
                {content.kicker && (
                  <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">
                    {content.kicker}
                  </p>
                )}

                {headline && (
                  <h1
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F4F1EA] leading-[1.08]"
                    style={{ textWrap: 'balance' }}
                  >
                    {headline}
                  </h1>
                )}

                {subheadline && (
                  <p className="text-base sm:text-lg text-[#D4D4D8] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    {subheadline}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2 w-full">
                  {latestTrack && showLatestPlay && (
                    <button
                      type="button"
                      onClick={() => playTrack(latestTrack, publishedMusic)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold tracking-wide transition-all hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0 shadow-md"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{latestPlayText}</span>
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
                </div>
              </motion.div>

              {/* Right Column: Editorial Portrait Card (ONLY shown if database actually has profileImage) */}
              {portraitImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="lg:col-span-5 flex"
                >
                  <div className="w-full min-h-[340px] lg:h-full rounded-lg bg-[#111116]/90 border border-[#24242C] overflow-hidden relative flex flex-col justify-end p-6 sm:p-8 shadow-2xl">
                    <ShimmerImage
                      src={portraitImage}
                      alt={headline}
                      fill
                      sizes="(max-width: 1024px) 100vw, 480px"
                      className="object-cover object-center"
                    />
                    <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

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
                  </div>
                </motion.div>
              )}
            </div>
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
                {tracksToShow.map((track) => (
                  <MusicCard key={track.id} track={track} queue={tracksToShow} />
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
                {publishedAlbums.slice(0, displayLimit).map((album) => (
                  <AlbumCard key={album.id} album={album} />
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

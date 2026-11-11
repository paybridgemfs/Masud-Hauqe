import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPublicWebsiteData } from '@/lib/db.js';
import { Disc3, Globe, MapPin, Award } from 'lucide-react';
import SocialMediaLinks from '@/components/website/SocialMediaLinks.jsx';

export const revalidate = 60;

export async function generateMetadata() {
  const { artist, seoSettings } = await getPublicWebsiteData();
  const seo = (seoSettings || []).find((s) => s.page === 'about');
  return {
    title: seo?.metaTitle || `About ${artist?.name || 'Masud Hauqe'} — Biography`,
    description:
      seo?.metaDescription ||
      artist?.shortBiography ||
      `Official biography and musical background of ${artist?.name || 'Masud Hauqe'}.`,
  };
}

export default async function AboutPage() {
  const { artist, socialLinks, publishedMusic, publishedAlbums } = await getPublicWebsiteData();
  const achievements = Array.isArray(artist?.achievements) ? artist.achievements : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16">
      {/* Editorial Monograph Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch border-b border-[#222226] pb-16">
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">
              ARTIST MONOGRAPH & BIOGRAPHY
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#F4F1EA] tracking-tight">
              {artist?.name || 'Masud Hauqe'}
            </h1>
            {artist?.shortBiography && (
              <p className="text-lg text-[#D4D4D8] leading-relaxed">{artist.shortBiography}</p>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#9A9AA2]">
              {artist?.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C8A464]" />
                  <span>{artist.location}</span>
                </span>
              )}
              {artist?.location && artist?.website && <span aria-hidden="true">·</span>}
              {artist?.website && (
                <a
                  href={artist.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#C8A464] hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{artist.website}</span>
                </a>
              )}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{publishedMusic.length} Published Recordings</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{publishedAlbums.length} Studio Albums</span>
            </div>

            {socialLinks.length > 0 && (
              <div className="pt-1">
                <SocialMediaLinks socialLinks={socialLinks} variant="footer-icons" />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="h-full min-h-[280px] rounded-lg bg-[#111115] border border-[#24242C] overflow-hidden relative flex items-center justify-center p-8">
            {artist?.profileImage || artist?.coverImage ? (
              <Image
                src={artist.profileImage || artist.coverImage}
                alt={artist.name || 'Masud Hauqe'}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            ) : (
              <div className="text-center space-y-3">
                <div className="w-24 h-24 rounded-full border border-[#C8A464]/50 bg-[#0B0B0E] flex items-center justify-center mx-auto">
                  <Disc3 className="w-10 h-10 text-[#C8A464]" />
                </div>
                <p className="text-sm font-semibold tracking-wider text-[#F4F1EA]">
                  {artist?.name || 'Masud Hauqe'}
                </p>
                <p className="text-xs text-[#8E8E96]">Official Artist Portrait</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full Biography & Musical Background */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-[#222226] pb-16">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
            01. BIOGRAPHY
          </h2>
          <div className="text-base text-[#E4E4E7] leading-relaxed whitespace-pre-line space-y-4">
            {artist?.biography ||
              'Biography content has not been entered yet. Update the artist biography in the Admin Dashboard.'}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-3">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
              02. CAREER INFORMATION
            </h2>
            <p className="text-sm text-[#D4D4D8] leading-relaxed whitespace-pre-line">
              {artist?.careerInfo ||
                'Career details can be managed via the Admin Artist Management console.'}
            </p>
          </div>

          <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-3">
            <h2 className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
              03. MUSICAL BACKGROUND
            </h2>
            <p className="text-sm text-[#D4D4D8] leading-relaxed whitespace-pre-line">
              {artist?.musicalBg ||
                'Musical background and instrumentation notes are managed via the Admin Dashboard.'}
            </p>
          </div>
        </div>
      </section>

      {/* Achievements & Milestones */}
      <section className="space-y-6 border-b border-[#222226] pb-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
            04. MILESTONES & RECOGNITION
          </p>
          <h2 className="text-2xl font-bold text-[#F4F1EA] mt-1">Career Achievements</h2>
        </div>

        {achievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {achievements.map((ach, idx) => (
              <div
                key={ach.id || idx}
                className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[#C8A464] tabular-nums">
                  <Award className="w-4 h-4" />
                  <span>{ach.year || 'Milestone'}</span>
                </div>
                <h3 className="text-base font-semibold text-[#F4F1EA]">{ach.title}</h3>
                {ach.description && (
                  <p className="text-xs text-[#9A9AA2] leading-relaxed">{ach.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#111115] border border-[#222228] rounded-lg p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#9A9AA2]">
              No career achievements have been listed yet. Verified achievements can be added in Admin → Artist Management.
            </p>
            <Link
              href="/admin/artist"
              className="px-4 py-2 rounded bg-[#1C1C22] border border-[#2E2E38] text-xs font-semibold text-[#F4F1EA] whitespace-nowrap"
            >
              Manage Artist Profile
            </Link>
          </div>
        )}
      </section>

      {/* Social Links */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-[#F4F1EA]">Official Social Profiles</h2>
          <p className="text-xs text-[#8E8E96] mt-1">
            Follow {artist?.name || 'Masud Hauqe'} across verified platforms.
          </p>
        </div>
        {socialLinks.length > 0 ? (
          <SocialMediaLinks socialLinks={socialLinks} variant="buttons" />
        ) : (
          <p className="text-xs text-[#71717A]">
            No external social profiles configured yet.
          </p>
        )}
      </section>
    </div>
  );
}

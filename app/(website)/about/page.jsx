import React from 'react';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';
import { getPublicWebsiteData } from '@/lib/db.js';
import { Globe, MapPin, Award } from 'lucide-react';
import SocialMediaLinks from '@/components/website/SocialMediaLinks.jsx';

export const revalidate = 60;

export async function generateMetadata() {
  const { artist, seoSettings } = await getPublicWebsiteData();
  const seo = (seoSettings || []).find((s) => s.page === 'about');
  const artistName = artist?.name || '';
  return {
    title: seo?.metaTitle || (artistName ? `About ${artistName}` : 'About Artist'),
    description: seo?.metaDescription || artist?.shortBiography || '',
  };
}

export default async function AboutPage() {
  const { artist, socialLinks, publishedMusic, publishedAlbums } = await getPublicWebsiteData();
  const achievements = Array.isArray(artist?.achievements) ? artist.achievements : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-16">
      {/* Editorial Monograph Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch border-b border-[#222226] pb-16">
        <div className={artist?.profileImage || artist?.coverImage ? 'lg:col-span-7 flex flex-col justify-between space-y-6' : 'lg:col-span-12 flex flex-col justify-between space-y-6'}>
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">
              ARTIST MONOGRAPH & BIOGRAPHY
            </p>
            {artist?.name && (
              <h1 className="text-4xl sm:text-5xl font-bold text-[#F4F1EA] tracking-tight">
                {artist.name}
              </h1>
            )}
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
              {publishedMusic.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{publishedMusic.length} Published Recordings</span>
                </>
              )}
              {publishedAlbums.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{publishedAlbums.length} Official Releases</span>
                </>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="pt-1">
                <SocialMediaLinks socialLinks={socialLinks} variant="footer-icons" />
              </div>
            )}
          </div>
        </div>

        {(artist?.profileImage || artist?.coverImage) && (
          <div className="lg:col-span-5">
            <div className="h-full min-h-[280px] rounded-lg bg-[#111115] border border-[#24242C] overflow-hidden relative flex items-center justify-center p-8">
              <ShimmerImage
                src={artist.profileImage || artist.coverImage}
                alt={artist?.name || ''}
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </section>

      {/* Full Biography & Career Sections (ONLY shown if data exists in DB) */}
      {(artist?.biography || artist?.careerInfo || artist?.musicalBg) && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-[#222226] pb-16">
          {artist?.biography && (
            <div className={artist?.careerInfo || artist?.musicalBg ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
              <h2 className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
                01. BIOGRAPHY
              </h2>
              <div className="text-base text-[#E4E4E7] leading-relaxed whitespace-pre-line space-y-4">
                {artist.biography}
              </div>
            </div>
          )}

          {(artist?.careerInfo || artist?.musicalBg) && (
            <div className={artist?.biography ? 'lg:col-span-5 space-y-8' : 'lg:col-span-12 space-y-8'}>
              {artist?.careerInfo && (
                <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-3">
                  <h2 className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
                    02. CAREER INFORMATION
                  </h2>
                  <p className="text-sm text-[#D4D4D8] leading-relaxed whitespace-pre-line">
                    {artist.careerInfo}
                  </p>
                </div>
              )}

              {artist?.musicalBg && (
                <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-3">
                  <h2 className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
                    03. MUSICAL BACKGROUND
                  </h2>
                  <p className="text-sm text-[#D4D4D8] leading-relaxed whitespace-pre-line">
                    {artist.musicalBg}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Achievements (ONLY shown if database actually contains achievements) */}
      {achievements.length > 0 && (
        <section className="space-y-6 border-b border-[#222226] pb-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
              MILESTONES & RECOGNITION
            </p>
            <h2 className="text-2xl font-bold text-[#F4F1EA] mt-1">Career Achievements</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {achievements.map((ach, idx) => (
              <div
                key={ach.id || idx}
                className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-[#C8A464] tabular-nums">
                  <Award className="w-4 h-4" />
                  {ach.year && <span>{ach.year}</span>}
                </div>
                {ach.title && <h3 className="text-base font-semibold text-[#F4F1EA]">{ach.title}</h3>}
                {ach.description && (
                  <p className="text-xs text-[#9A9AA2] leading-relaxed">{ach.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Social Links (ONLY shown if database actually has social links) */}
      {socialLinks.length > 0 && (
        <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-[#F4F1EA]">Official Social Profiles</h2>
            {artist?.name && (
              <p className="text-xs text-[#8E8E96] mt-1">
                Follow {artist.name} across verified platforms.
              </p>
            )}
          </div>
          <SocialMediaLinks socialLinks={socialLinks} variant="buttons" />
        </section>
      )}
    </div>
  );
}

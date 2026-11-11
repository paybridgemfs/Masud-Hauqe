import React from 'react';
import { getPublicWebsiteData } from '@/lib/db.js';
import SectionRenderer from '@/components/website/SectionRenderer.jsx';

export const revalidate = 60;

export default async function HomePage() {
  const {
    artist,
    settings,
    publishedMusic,
    popularMusic,
    publishedAlbums,
    visibleSections,
    gallery,
    socialLinks,
  } = await getPublicWebsiteData();

  // Structured Data (Schema.org MusicGroup)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist?.name || '',
    description: artist?.shortBiography || artist?.biography || '',
    url: settings.website || '',
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {visibleSections.length > 0 ? (
        visibleSections.map((section) => (
          <SectionRenderer
            key={section.id}
            section={section}
            artist={artist}
            publishedMusic={publishedMusic}
            popularMusic={popularMusic}
            publishedAlbums={publishedAlbums}
            gallery={gallery}
            socialLinks={socialLinks}
            settings={settings}
          />
        ))
      ) : (
        <section className="max-w-7xl mx-auto px-4 py-24 text-center">
          {artist?.name && (
            <h1 className="text-3xl font-bold text-[#F4F1EA]">
              {artist.name}
            </h1>
          )}
          <p className="text-sm text-[#8E8E96] mt-2">
            All homepage sections are currently hidden. Enable or add sections in the Admin Section Manager.
          </p>
        </section>
      )}
    </div>
  );
}

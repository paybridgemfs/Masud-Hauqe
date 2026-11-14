import React from 'react';
import Link from 'next/link';
import ShimmerImage from '@/components/ui/ShimmerImage.jsx';
import { Image as ImageIcon } from 'lucide-react';
import { getPublicWebsiteData } from '@/lib/db.js';
import { buildPageSocialMetadata } from '@/lib/seo.js';

export const revalidate = 60;

export async function generateMetadata() {
  return buildPageSocialMetadata({ pageId: 'gallery', path: '/gallery' });
}

export default async function GalleryPage() {
  const { artist, gallery } = await getPublicWebsiteData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-10">
      <div className="border-b border-[#222226] pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">PHOTOGRAPHY</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA] mt-1">
            Artist Visual Gallery
          </h1>
          <p className="text-sm text-[#9A9AA2] mt-1.5 max-w-2xl">
            Curated studio portraits, concert photography, and archival imagery{artist?.name ? ` of ${artist.name}` : ''}.
          </p>
        </div>
        <span className="text-xs text-[#8E8E96] tabular-nums">{gallery.length} Photographs</span>
      </div>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.map((item) => (
            <figure
              key={item.id}
              className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-[#16161B] overflow-hidden">
                <ShimmerImage
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <figcaption className="p-4 space-y-1">
                <h2 className="text-base font-semibold text-[#F4F1EA]">{item.title}</h2>
                {item.description && (
                  <p className="text-xs text-[#8E8E96] leading-relaxed">{item.description}</p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-12 text-center max-w-xl mx-auto space-y-3">
          <ImageIcon className="w-9 h-9 text-[#C8A464] mx-auto" />
          <h2 className="text-lg font-semibold text-[#F4F1EA]">Gallery Archive Is Empty</h2>
          <p className="text-sm text-[#8E8E96] leading-relaxed">
            No fake placeholder photographs are displayed. Verified artist images added through the Admin Media Gallery Manager will appear here.
          </p>
          <div className="pt-2">
            <Link
              href="/about"
              className="inline-flex items-center px-4 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold hover:bg-[#D4B475] transition-colors"
            >
              Explore Artist Biography
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

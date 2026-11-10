import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicWebsiteData } from '@/lib/db.js';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { pages } = await getPublicWebsiteData();
  const page = pages.find((p) => p.slug === slug);
  if (!page) {
    return { title: 'Legal Document Not Found — Masud Hauqe' };
  }
  return {
    title: page.metaTitle || `${page.title} — Masud Hauqe`,
    description: page.metaDescription || page.title,
  };
}

export default async function LegalPage({ params }) {
  const { slug } = await params;
  const { pages } = await getPublicWebsiteData();
  const page = pages.find((p) => p.slug === slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-8">
      <div className="border-b border-[#222226] pb-6">
        <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">
          OFFICIAL LEGAL & USAGE POLICY
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA] mt-1">{page.title}</h1>
        <p className="text-xs text-[#8E8E96] mt-2 tabular-nums">
          Last Updated: {new Date(page.updatedAt || page.createdAt).toLocaleDateString('en-US')}
        </p>
      </div>

      <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 sm:p-10 text-sm sm:text-base text-[#D4D4D8] leading-relaxed whitespace-pre-line">
        {page.content}
      </div>
    </div>
  );
}

import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicWebsiteData } from '@/lib/db.js';
import MusicDetailClient from '@/components/music/MusicDetailClient.jsx';

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { publishedMusic, artist } = await getPublicWebsiteData();
  const track = publishedMusic.find((m) => m.slug === slug || m.id === slug);
  if (!track) {
    return { title: 'Recording Not Found — Masud Hauqe' };
  }
  return {
    title: `${track.title} — ${artist?.name || 'Masud Hauqe'}`,
    description:
      track.description ||
      `Listen to ${track.title} by ${artist?.name || 'Masud Hauqe'} on the official artist platform.`,
    openGraph: {
      title: `${track.title} — ${artist?.name || 'Masud Hauqe'}`,
      description: track.description || '',
      images: track.thumbnail ? [track.thumbnail] : [],
    },
  };
}

export default async function MusicDetailPage({ params }) {
  const { slug } = await params;
  const { publishedMusic } = await getPublicWebsiteData();
  const track = publishedMusic.find((m) => m.slug === slug || m.id === slug);

  if (!track) {
    notFound();
  }

  const relatedTracks = publishedMusic.filter((m) => m.id !== track.id).slice(0, 3);

  return <MusicDetailClient track={track} relatedTracks={relatedTracks} />;
}

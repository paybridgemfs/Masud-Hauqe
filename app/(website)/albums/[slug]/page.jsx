import React from 'react';
import { notFound } from 'next/navigation';
import { getPublicWebsiteData } from '@/lib/db.js';
import AlbumDetailClient from '@/components/music/AlbumDetailClient.jsx';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { publishedAlbums, artist } = await getPublicWebsiteData();
  const album = publishedAlbums.find((a) => a.slug === slug || a.id === slug);
  if (!album) {
    return { title: 'Album Not Found — Masud Hauqe' };
  }
  return {
    title: `${album.title} — Album by ${artist?.name || 'Masud Hauqe'}`,
    description: album.description || `Listen to ${album.title} by ${artist?.name || 'Masud Hauqe'}.`,
  };
}

export default async function AlbumDetailPage({ params }) {
  const { slug } = await params;
  const { publishedAlbums } = await getPublicWebsiteData();
  const album = publishedAlbums.find((a) => a.slug === slug || a.id === slug);

  if (!album) {
    notFound();
  }

  return <AlbumDetailClient album={album} />;
}

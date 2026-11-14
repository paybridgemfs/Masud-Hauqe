import React from "react";
import { notFound } from "next/navigation";
import { getPublicWebsiteData } from "@/lib/db.js";
import { resolveOrigin, resolveReleaseSocialBanner } from "@/lib/seo.js";
import AlbumDetailClient from "@/components/music/AlbumDetailClient.jsx";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [{ publishedAlbums, artist, settings }, origin] = await Promise.all([
    getPublicWebsiteData(),
    resolveOrigin(),
  ]);
  const album = publishedAlbums.find((a) => a.slug === slug || a.id === slug);
  if (!album) {
    return { title: "Release Not Found" };
  }

  const absoluteCover = resolveReleaseSocialBanner(album, origin);
  const artistName = artist?.name || settings?.siteName || "Masud Hauqe";
  const siteName = settings?.siteName || artistName;
  const trackCount = (album.tracks || []).length;
  const pageTitle = `${album.title} — ${artistName}`;
  const desc =
    album.description ||
    `Official release "${album.title}" by ${artistName} (${trackCount} ${
      trackCount === 1 ? "track" : "tracks"
    }). Stream all tracks or download the full release ZIP.`;
  const canonicalUrl = `${origin}/releases/${album.slug}`;

  return {
    title: pageTitle,
    description: desc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description: desc,
      type: "music.album",
      url: canonicalUrl,
      siteName,
      images: absoluteCover
        ? [
            {
              url: absoluteCover,
              width: 1200,
              height: 630,
              alt: `${album.title} — ${artistName}`,
            },
          ]
        : [],
    },
    twitter: {
      card: absoluteCover ? "summary_large_image" : "summary",
      title: pageTitle,
      description: desc,
      images: absoluteCover ? [absoluteCover] : [],
    },
  };
}

export default async function AlbumDetailPage({ params }) {
  const { slug } = await params;
  const { publishedAlbums } = await getPublicWebsiteData();
  const album = publishedAlbums.find((a) => a.slug === slug || a.id === slug);

  if (!album) {
    notFound();
  }

  const origin = await resolveOrigin();
  return <AlbumDetailClient album={album} shareUrl={`${origin}/releases/${album.slug}`} />;
}

import React from "react";
import { notFound } from "next/navigation";
import { getPublicWebsiteData, sortAlbumTracks } from "@/lib/db.js";
import { resolveOrigin, resolveTrackSocialBanner } from "@/lib/seo.js";
import MusicDetailClient from "@/components/music/MusicDetailClient.jsx";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const [{ publishedMusic, artist, settings }, origin] = await Promise.all([
    getPublicWebsiteData(),
    resolveOrigin(),
  ]);
  const track = publishedMusic.find((m) => m.slug === slug || m.id === slug);
  if (!track) {
    return { title: "Recording Not Found" };
  }

  const absoluteThumb = resolveTrackSocialBanner(track, origin);
  const artistName = artist?.name || settings?.siteName || "Masud Hauqe";
  const siteName = settings?.siteName || artistName;
  const isReleaseTrack = Boolean(track.album?.title);

  const pageTitle = isReleaseTrack
    ? `${track.title} (${track.album.title}) — ${artistName}`
    : `${track.title} — ${artistName}`;
  const ogTitle = isReleaseTrack
    ? `${track.title} · ${track.album.title} — ${artistName}`
    : `${track.title} — ${artistName}`;
  const desc =
    track.description ||
    (isReleaseTrack
      ? `Stream or download "${track.title}" from the official release "${track.album.title}" by ${artistName}.`
      : `Stream or download "${track.title}" — Official Master Recording by ${artistName}.`);
  const canonicalUrl = `${origin}/music/${track.slug}`;

  return {
    title: pageTitle,
    description: desc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: ogTitle,
      description: desc,
      type: "music.song",
      url: canonicalUrl,
      siteName,
      images: absoluteThumb
        ? [
            {
              url: absoluteThumb,
              width: 1200,
              height: 630,
              alt: isReleaseTrack ? `${track.title} — ${track.album.title}` : track.title,
            },
          ]
        : [],
    },
    twitter: {
      card: absoluteThumb ? "summary_large_image" : "summary",
      title: ogTitle,
      description: desc,
      images: absoluteThumb ? [absoluteThumb] : [],
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

  // If this track belongs to a Release, Related Recordings shows ONLY the other tracks in that same Release.
  // If this track is a Single track, Related Recordings shows ONLY other Single tracks.
  const relatedTracks = track.albumId
    ? sortAlbumTracks(
        publishedMusic.filter(
          (m) => m.albumId === track.albumId && m.id !== track.id
        )
      )
    : publishedMusic
        .filter((m) => !m.albumId && m.id !== track.id)
        .slice(0, 4);

  const origin = await resolveOrigin();
  return <MusicDetailClient track={track} relatedTracks={relatedTracks} shareUrl={`${origin}/music/${track.slug}`} />;
}

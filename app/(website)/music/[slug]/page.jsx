import React from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPublicWebsiteData, sortAlbumTracks } from "@/lib/db.js";
import MusicDetailClient from "@/components/music/MusicDetailClient.jsx";

export const revalidate = 60;

async function resolveOrigin() {
  const configuredAppUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (
    configuredAppUrl &&
    !configuredAppUrl.includes("localhost") &&
    !configuredAppUrl.includes("127.0.0.1")
  ) {
    return configuredAppUrl;
  }
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`;
    }
    if (configuredAppUrl) return configuredAppUrl;
    if (host) return `${proto}://${host}`;
  } catch {
    // Fallback to APP_URL
  }
  return configuredAppUrl || "http://localhost:3000";
}

function toAbsoluteUrl(url, origin) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { publishedMusic, artist } = await getPublicWebsiteData();
  const track = publishedMusic.find((m) => m.slug === slug || m.id === slug);
  if (!track) {
    return { title: "Recording Not Found" };
  }

  const origin = await resolveOrigin();
  const absoluteThumb = toAbsoluteUrl(track.thumbnail, origin);
  const artistName = artist?.name || "";
  const desc = artistName
    ? `Master Recording by ${artistName}${track.album ? ` · Release: ${track.album.title}` : ""}.`
    : `Master Recording: ${track.title}.`;

  return {
    title: artistName ? `${track.title} — ${artistName}` : track.title,
    description: desc,
    openGraph: {
      title: track.title,
      description: desc,
      type: "music.song",
      url: `${origin}/music/${track.slug}`,
      siteName: artistName,
      images: absoluteThumb ? [{ url: absoluteThumb, alt: track.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: track.title,
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

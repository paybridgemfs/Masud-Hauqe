import React from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getPublicWebsiteData } from "@/lib/db.js";
import AlbumDetailClient from "@/components/music/AlbumDetailClient.jsx";

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
  const { publishedAlbums, artist } = await getPublicWebsiteData();
  const album = publishedAlbums.find((a) => a.slug === slug || a.id === slug);
  if (!album) {
    return { title: "Release Not Found" };
  }

  const origin = await resolveOrigin();
  const absoluteCover = toAbsoluteUrl(album.coverImage, origin);
  const artistName = artist?.name || "";
  const desc =
    album.description ||
    (artistName
      ? `Official release "${album.title}" by ${artistName} (${(album.tracks || []).length} tracks).`
      : `Official release "${album.title}" (${(album.tracks || []).length} tracks).`);

  return {
    title: artistName ? `${album.title} — ${artistName}` : album.title,
    description: desc,
    openGraph: {
      title: album.title,
      description: desc,
      type: "music.album",
      url: `${origin}/releases/${album.slug}`,
      siteName: artistName,
      images: absoluteCover ? [{ url: absoluteCover, alt: album.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: album.title,
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

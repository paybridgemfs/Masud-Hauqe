'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Download,
  Music,
  Disc,
  TrendingUp,
  Flame,
  ShieldCheck,
  ArrowUpDown,
} from 'lucide-react';

export default function AdminAnalyticsClient({
  musicList = [],
  albumsList = [],
  artistName = 'Masud Hauqe',
}) {
  const [sortBy, setSortBy] = useState('plays'); // 'plays' | 'downloads'

  const publishedTracks = musicList.filter((m) => m.isPublished);
  const draftTracks = musicList.filter((m) => !m.isPublished);
  const singleTracks = musicList.filter((m) => !m.albumId);
  const releaseTracks = musicList.filter((m) => Boolean(m.albumId));
  const publishedAlbums = albumsList.filter((a) => a.isPublished);

  const totalPlays = musicList.reduce((sum, m) => sum + (Number(m.playCount) || 0), 0);
  const totalDownloads = musicList.reduce((sum, m) => sum + (Number(m.downloadCount) || 0), 0);

  const sortedTracks = [...musicList].sort((a, b) => {
    if (sortBy === 'downloads') {
      const diff = (Number(b.downloadCount) || 0) - (Number(a.downloadCount) || 0);
      if (diff !== 0) return diff;
    }
    return (Number(b.playCount) || 0) - (Number(a.playCount) || 0);
  });

  const topTrack =
    [...musicList].sort((a, b) => (Number(b.playCount) || 0) - (Number(a.playCount) || 0))[0] ||
    null;

  // Real aggregated performance per Release
  const releaseBreakdown = albumsList
    .map((album) => {
      const tracksInAlbum = musicList.filter((m) => m.albumId === album.id);
      const plays = tracksInAlbum.reduce((sum, m) => sum + (Number(m.playCount) || 0), 0);
      const downloads = tracksInAlbum.reduce((sum, m) => sum + (Number(m.downloadCount) || 0), 0);
      return {
        id: album.id,
        title: album.title,
        isPublished: album.isPublished,
        trackCount: tracksInAlbum.length,
        plays,
        downloads,
      };
    })
    .sort((a, b) => b.plays - a.plays);

  const singlesPlays = singleTracks.reduce((sum, m) => sum + (Number(m.playCount) || 0), 0);
  const singlesDownloads = singleTracks.reduce((sum, m) => sum + (Number(m.downloadCount) || 0), 0);

  const maxCategoryPlays = Math.max(
    1,
    singlesPlays,
    ...releaseBreakdown.map((r) => r.plays)
  );

  return (
    <div className="space-y-8">
      {/* Real-time Database Header Strip */}
      <div className="bg-[#111115] border border-[#222228] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#4ADE80]" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#F4F1EA] flex items-center gap-2">
              <span>Live Database Telemetry</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/30 font-semibold">
                VERIFIED DB COUNTS
              </span>
            </h2>
            <p className="text-xs text-[#8E8E96] mt-0.5">
              Actual stream plays, MP3 downloads, and catalog counts recorded for {artistName}.
            </p>
          </div>
        </div>

        {/* Leaderboard Sort Switcher */}
        <div className="flex items-center gap-1 bg-[#09090B] border border-[#26262E] rounded-lg p-1 text-xs shrink-0">
          <span className="px-2 text-[11px] text-[#71717A] inline-flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            <span>Sort:</span>
          </span>
          {[
            { id: 'plays', label: 'Top Plays' },
            { id: 'downloads', label: 'Top Downloads' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSortBy(item.id)}
              className={`px-3 py-1.5 rounded font-medium transition-colors ${
                sortBy === item.id
                  ? 'bg-[#C8A464] text-[#09090B] font-semibold'
                  : 'text-[#8E8E96] hover:text-[#F4F1EA]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Real KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111115] border border-[#222228] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>TOTAL STREAM PLAYS</span>
            <Play className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-3xl font-bold text-[#F4F1EA] tabular-nums">{totalPlays}</p>
          <p className="text-xs text-[#8E8E96] tabular-nums">
            Deduplicated across {musicList.length} master tracks
          </p>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>AUTHORIZED MP3 DOWNLOADS</span>
            <Download className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-3xl font-bold text-[#F4F1EA] tabular-nums">{totalDownloads}</p>
          <p className="text-xs text-[#8E8E96]">Delivered with embedded ID3v2 cover art</p>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>PUBLISHED REPERTOIRE</span>
            <Music className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-3xl font-bold text-[#F4F1EA] tabular-nums">
            {publishedTracks.length}
            <span className="text-sm font-normal text-[#8E8E96]"> / {musicList.length}</span>
          </p>
          <p className="text-xs text-[#8E8E96] tabular-nums">
            {singleTracks.length} singles · {releaseTracks.length} release tracks · {draftTracks.length} drafts
          </p>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8E8E96]">
            <span>TOP STREAMED MASTER</span>
            <Flame className="w-4 h-4 text-[#C8A464]" />
          </div>
          <p className="text-base font-bold text-[#F4F1EA] truncate">
            {topTrack?.title || 'No Tracks Uploaded Yet'}
          </p>
          <p className="text-xs text-[#C8A464] tabular-nums">
            {topTrack ? `${topTrack.playCount || 0} plays · ${topTrack.downloadCount || 0} downloads` : `${publishedAlbums.length} published releases`}
          </p>
        </div>
      </div>

      {/* Real Catalog Breakdown + Track Performance Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Release & Singles Stream Share (Real DB Aggregates) */}
        <div className="lg:col-span-5 bg-[#111115] border border-[#222228] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1E1E24] pb-3">
            <h2 className="text-base font-bold text-[#F4F1EA] flex items-center gap-2">
              <Disc className="w-4 h-4 text-[#C8A464]" />
              <span>Catalog Breakdown ({publishedAlbums.length}/{albumsList.length} Releases)</span>
            </h2>
            <Link href="/admin/albums" className="text-xs text-[#C8A464] hover:underline">
              Releases →
            </Link>
          </div>

          <div className="space-y-4">
            {/* Single Masters Summary Row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-[#F4F1EA]">Single Masters</span>
                  <span className="text-[11px] text-[#8E8E96] ml-1.5">
                    ({singleTracks.length} tracks)
                  </span>
                </div>
                <div className="tabular-nums font-mono text-[#C8A464] font-semibold shrink-0">
                  {singlesPlays} plays{' '}
                  <span className="text-[#8E8E96] font-normal">({singlesDownloads} DL)</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-[#1C1C22] rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.round((singlesPlays / maxCategoryPlays) * 100)}%` }}
                  className="h-full bg-gradient-to-r from-[#8E6F36] to-[#C8A464] rounded-full"
                />
              </div>
            </div>

            {releaseBreakdown.length > 0 ? (
              releaseBreakdown.map((rel) => (
                <div key={rel.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 truncate">
                      <span className="font-semibold text-[#F4F1EA]">{rel.title}</span>
                      <span className="text-[11px] text-[#8E8E96] ml-1.5">
                        ({rel.trackCount} tracks{!rel.isPublished ? ' · Draft' : ''})
                      </span>
                    </div>
                    <div className="tabular-nums font-mono text-[#C8A464] font-semibold shrink-0">
                      {rel.plays} plays{' '}
                      <span className="text-[#8E8E96] font-normal">({rel.downloads} DL)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#1C1C22] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.round((rel.plays / maxCategoryPlays) * 100)}%` }}
                      className="h-full bg-gradient-to-r from-[#8E6F36] to-[#C8A464] rounded-full"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#71717A]">No multi-track releases created yet.</p>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-[#0B0B0E] border border-[#1E1E24] flex items-start gap-2.5 text-[11px] text-[#8E8E96]">
            <ShieldCheck className="w-4 h-4 text-[#C8A464] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Privacy-first telemetry: only aggregate per-track play and download counts are persisted in PostgreSQL. Listener IP addresses and geographic profiling are intentionally not stored.
            </p>
          </div>
        </div>

        {/* Top Tracks Performance Leaderboard */}
        <div className="lg:col-span-7 bg-[#111115] border border-[#222228] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E1E24] pb-3">
            <h2 className="text-base font-bold text-[#F4F1EA] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C8A464]" />
              <span>
                Track Performance Leaderboard ({sortedTracks.length} Tracks)
              </span>
            </h2>
            <Link href="/admin/music" className="text-xs text-[#C8A464] hover:underline">
              Manage Tracks →
            </Link>
          </div>

          {sortedTracks.length > 0 ? (
            <div className="divide-y divide-[#1C1C22] max-h-[420px] overflow-y-auto pr-1">
              {sortedTracks.slice(0, 15).map((track, idx) => (
                <div
                  key={track.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[#15151A] px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[#8E8E96] font-semibold w-6 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#F4F1EA] truncate">{track.title}</p>
                      <p className="text-[11px] text-[#8E8E96] truncate">
                        {track.duration || '0:00'} · {track.isPublished ? 'Published' : 'Draft'}
                        {track.albumId ? ' · Release Track' : ' · Single'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-right tabular-nums">
                    <div>
                      <span className="font-semibold text-[#F4F1EA] block">
                        {track.playCount || 0}
                      </span>
                      <span className="text-[10px] text-[#8E8E96]">plays</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#C8A464] block">
                        {track.downloadCount || 0}
                      </span>
                      <span className="text-[10px] text-[#8E8E96]">DL</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#8E8E96]">
              No tracks uploaded yet. Go to Add Music to publish master recordings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

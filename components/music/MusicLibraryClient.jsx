'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Music2, Play } from 'lucide-react';
import MusicCard from './MusicCard.jsx';
import { usePlayer } from '@/components/player/PlayerContext.jsx';

export default function MusicLibraryClient({ initialMusic = [], albums = [] }) {
  const { playAlbum } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState('all');
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest' | 'popular'
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredMusic = useMemo(() => {
    let list = [...initialMusic];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.album?.title || '').toLowerCase().includes(q)
      );
    }

    if (selectedAlbumId !== 'all') {
      list = list.filter((m) => m.albumId === selectedAlbumId);
    }

    if (sortOrder === 'popular') {
      list.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [initialMusic, searchQuery, selectedAlbumId, sortOrder]);

  const displayedMusic = filteredMusic.slice(0, visibleCount);

  return (
    <div className="space-y-8">
      {/* Interactive Filter & Search Toolbar */}
      <div className="bg-[#111115] border border-[#222228] rounded-lg p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8E8E96] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(12);
            }}
            placeholder="Search recordings by title or album..."
            aria-label="Search music library"
            className="w-full bg-[#09090B] border border-[#27272E] rounded pl-10 pr-4 py-2 text-sm text-[#F4F1EA] placeholder:text-[#71717A] focus:outline-none focus:border-[#C8A464]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Album Filter */}
          <select
            aria-label="Filter by album"
            value={selectedAlbumId}
            onChange={(e) => {
              setSelectedAlbumId(e.target.value);
              setVisibleCount(12);
            }}
            className="bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs font-medium text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
          >
            <option value="all">All Albums ({initialMusic.length})</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.title}
              </option>
            ))}
          </select>

          {/* Segmented Sort Control */}
          <div className="flex items-center gap-1 p-1 bg-[#09090B] border border-[#27272E] rounded">
            <button
              type="button"
              onClick={() => setSortOrder('latest')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                sortOrder === 'latest'
                  ? 'bg-[#C8A464] text-[#09090B]'
                  : 'text-[#9A9AA2] hover:text-[#F4F1EA]'
              }`}
            >
              Latest Releases
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('popular')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                sortOrder === 'popular'
                  ? 'bg-[#C8A464] text-[#09090B]'
                  : 'text-[#9A9AA2] hover:text-[#F4F1EA]'
              }`}
            >
              Popular Music
            </button>
          </div>

          {filteredMusic.length > 0 && (
            <button
              type="button"
              onClick={() => playAlbum(filteredMusic, 0)}
              className="px-4 py-2 rounded bg-[#1C1B18] border border-[#C8A464]/40 text-xs font-semibold text-[#C8A464] hover:bg-[#C8A464] hover:text-[#09090B] flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play All ({filteredMusic.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Music Grid or Empty State */}
      {displayedMusic.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {displayedMusic.map((track) => (
              <MusicCard key={track.id} track={track} queue={filteredMusic} />
            ))}
          </div>

          {visibleCount < filteredMusic.length && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-6 py-2.5 rounded border border-[#2E2E38] text-xs font-semibold text-[#F4F1EA] hover:border-[#C8A464] hover:text-[#C8A464] transition-colors"
              >
                Load More Recordings ({filteredMusic.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-12 text-center max-w-xl mx-auto space-y-3">
          <Music2 className="w-9 h-9 text-[#C8A464] mx-auto" />
          <h2 className="text-lg font-semibold text-[#F4F1EA]">
            {initialMusic.length === 0
              ? 'The Public Music Archive Is Currently Empty'
              : 'No Recordings Match Your Filter'}
          </h2>
          <p className="text-sm text-[#8E8E96] leading-relaxed">
            {initialMusic.length === 0
              ? 'Only verified, published recordings stored in PostgreSQL and Google Drive appear here. Add your first track through the Admin Dashboard.'
              : 'Try clearing your search query or switching the selected album filter.'}
          </p>
          {initialMusic.length === 0 ? (
            <div className="pt-2">
              <Link
                href="/admin/music/add"
                className="inline-flex items-center px-4 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold hover:bg-[#D4B475] transition-colors"
              >
                Add First Track in Admin CMS
              </Link>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedAlbumId('all');
                }}
                className="px-4 py-2 rounded border border-[#2E2E38] text-xs font-semibold text-[#F4F1EA] hover:border-[#C8A464]"
              >
                Reset Search & Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

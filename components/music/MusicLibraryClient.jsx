'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Search, Music2, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import MusicCard from './MusicCard.jsx';
import { usePlayer } from '@/components/player/PlayerContext.jsx';

const PAGE_SIZE = 10;

export default function MusicLibraryClient({ initialMusic = [] }) {
  const { playAlbum } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest' | 'popular'
  const [currentPage, setCurrentPage] = useState(1);

  const filteredMusic = useMemo(() => {
    let list = (initialMusic || []).filter((m) => !m.albumId);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q));
    }

    if (sortOrder === 'popular') {
      list.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [initialMusic, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredMusic.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const displayedMusic = filteredMusic.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-8">
      {/* Interactive Filter & Search Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-[#111115] border border-[#222228] rounded-lg p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8E8E96] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search single tracks by title..."
            aria-label="Search music library"
            className="w-full bg-[#09090B] border border-[#27272E] rounded pl-10 pr-4 py-2 text-sm text-[#F4F1EA] placeholder:text-[#71717A] focus:outline-none focus:border-[#C8A464] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Sort Control */}
          <div className="flex items-center gap-1 p-1 bg-[#09090B] border border-[#27272E] rounded">
            <button
              type="button"
              onClick={() => {
                setSortOrder('latest');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                sortOrder === 'latest'
                  ? 'bg-[#C8A464] text-[#09090B]'
                  : 'text-[#9A9AA2] hover:text-[#F4F1EA]'
              }`}
            >
              Latest Music
            </button>
            <button
              type="button"
              onClick={() => {
                setSortOrder('popular');
                setCurrentPage(1);
              }}
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
      </motion.div>

      {/* Music Grid or Empty State */}
      {displayedMusic.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {displayedMusic.map((track, idx) => (
              <MusicCard
                key={track.id}
                track={track}
                queue={filteredMusic}
                index={startIdx + idx}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#222228]">
              <p className="text-xs text-[#8E8E96] tabular-nums">
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filteredMusic.length)} of{' '}
                {filteredMusic.length} tracks (Page {safePage} of {totalPages})
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded bg-[#111115] border border-[#27272E] text-xs font-semibold text-[#F4F1EA] hover:border-[#C8A464] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded text-xs font-semibold tabular-nums transition-colors ${
                      pageNum === safePage
                        ? 'bg-[#C8A464] text-[#09090B]'
                        : 'bg-[#111115] border border-[#27272E] text-[#B4B4BC] hover:border-[#C8A464]'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded bg-[#111115] border border-[#27272E] text-xs font-semibold text-[#F4F1EA] hover:border-[#C8A464] disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-[#111115] border border-[#222228] rounded-lg p-12 text-center max-w-xl mx-auto space-y-3"
        >
          <Music2 className="w-9 h-9 text-[#C8A464] mx-auto" />
          <h2 className="text-lg font-semibold text-[#F4F1EA]">
            {initialMusic.length === 0
              ? 'No Single Tracks Published Yet'
              : 'No Recordings Match Your Search'}
          </h2>
          <p className="text-sm text-[#8E8E96] leading-relaxed">
            {initialMusic.length === 0
              ? 'Explore full multi-track collections on the Official Releases page, or add single tracks from the Admin Dashboard.'
              : 'Try clearing your search query.'}
          </p>
          {initialMusic.length === 0 ? (
            <div className="pt-2">
              <Link
                href="/releases"
                className="inline-flex items-center px-4 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold hover:bg-[#D4B475] transition-colors"
              >
                Browse Discography Releases
              </Link>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="px-4 py-2 rounded border border-[#2E2E38] text-xs font-semibold text-[#F4F1EA] hover:border-[#C8A464]"
              >
                Reset Search
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

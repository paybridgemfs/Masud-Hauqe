'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Trash2, Eye, EyeOff, Download, Music } from 'lucide-react';

export default function AdminMusicClient({ initialMusic = [], albums = [] }) {
  const [musicList, setMusicList] = useState(initialMusic);
  const [statusMsg, setStatusMsg] = useState('');

  async function toggleField(track, field) {
    const nextVal = !track[field];
    const res = await fetch(`/api/music/${track.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: nextVal }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setMusicList((prev) =>
        prev.map((m) => (m.id === track.id ? { ...m, ...data.music } : m))
      );
      setStatusMsg(`Updated "${track.title}".`);
    }
  }

  async function handleDelete(track) {
    const res = await fetch(`/api/music/${track.id}`, { method: 'DELETE' });
    if (res.ok) {
      setMusicList((prev) => prev.filter((m) => m.id !== track.id));
      setStatusMsg(`Deleted "${track.title}".`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs text-[#8E8E96] tabular-nums">
          Total Records in PostgreSQL: {musicList.length}
        </p>
        <Link
          href="/admin/music/add"
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Music</span>
        </Link>
      </div>

      {statusMsg && (
        <div className="p-3 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0]">
          {statusMsg}
        </div>
      )}

      {musicList.length > 0 ? (
        <div className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#222228] text-[#8E8E96]">
                  <th className="py-3.5 px-4 font-semibold">Track</th>
                  <th className="py-3.5 px-4 font-semibold">Album</th>
                  <th className="py-3.5 px-4 font-semibold">Duration</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">MP3 Download</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Plays / Downloads</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C22]">
                {musicList.map((track) => {
                  const albumObj = albums.find((a) => a.id === track.albumId);
                  return (
                    <tr key={track.id} className="hover:bg-[#15151A]">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#F4F1EA]">{track.title}</p>
                        <p className="text-[11px] text-[#8E8E96] font-mono">
                          Drive ID: {track.audioFileId || '—'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[#B4B4BC]">
                        {albumObj?.title || 'Single'}
                      </td>
                      <td className="py-3 px-4 text-[#B4B4BC] tabular-nums">
                        {track.duration || '0:00'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleField(track, 'isPublished')}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            track.isPublished ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
                          }`}
                        >
                          {track.isPublished ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleField(track, 'downloadEnabled')}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            track.downloadEnabled ? 'text-[#C8A464]' : 'text-[#71717A]'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{track.downloadEnabled ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[#B4B4BC]">
                        {track.playCount || 0} / {track.downloadCount || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(track)}
                          aria-label={`Delete ${track.title}`}
                          className="p-1.5 text-[#9A9AA2] hover:text-[#F87171] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-12 text-center space-y-3">
          <Music className="w-8 h-8 text-[#C8A464] mx-auto" />
          <h2 className="text-base font-semibold text-[#F4F1EA]">No Music Tracks Uploaded Yet</h2>
          <p className="text-xs text-[#8E8E96] max-w-md mx-auto">
            Your database begins with zero fabricated tracks. Click &ldquo;Add New Music&rdquo; to fetch YouTube metadata and upload your first MP3 master.
          </p>
        </div>
      )}
    </div>
  );
}

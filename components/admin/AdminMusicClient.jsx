'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Music,
  Video,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';

export default function AdminMusicClient({ initialMusic = [], albums = [] }) {
  const [musicList, setMusicList] = useState(initialMusic);
  const [statusMsg, setStatusMsg] = useState('');
  const [trackToDelete, setTrackToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function confirmDeleteTrack() {
    if (!trackToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/music/${trackToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setMusicList((prev) => prev.filter((m) => m.id !== trackToDelete.id));
        setStatusMsg(
          `Deleted "${trackToDelete.title}" and removed its MP3 file from Google Drive.`
        );
        setTrackToDelete(null);
      }
    } finally {
      setIsDeleting(false);
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
                  <th className="py-3.5 px-4 font-semibold">YouTube Video</th>
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
                      <td className="py-3 px-4">
                        {track.youtubeVideoId ? (
                          <button
                            type="button"
                            onClick={() => toggleField(track, 'includeYoutubeVideo')}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              track.includeYoutubeVideo ? 'text-[#4ADE80]' : 'text-[#71717A]'
                            }`}
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>{track.includeYoutubeVideo ? 'Added' : 'Hidden'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#52525B]">No YT ID</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-[#B4B4BC]">
                        {track.playCount || 0} / {track.downloadCount || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setTrackToDelete(track)}
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

      {/* Custom Delete Confirmation Modal */}
      {trackToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-music-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md bg-[#111115] border border-[#2C2C35] rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#222228]">
              <div className="flex items-center gap-2.5 text-[#F87171]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 id="delete-music-modal-title" className="text-sm font-bold text-[#F4F1EA]">
                  Confirm Music & Drive File Deletion
                </h3>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTrackToDelete(null)}
                aria-label="Close confirmation dialog"
                className="p-1 text-[#8E8E96] hover:text-[#F4F1EA] transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-[#F4F1EA]">&ldquo;{trackToDelete.title}&rdquo;</span>?
              </p>

              <div className="bg-[#09090B] border border-[#24242C] rounded p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#8E8E96]">Drive MP3 File ID:</span>
                  <span className="font-mono text-[#C8A464] truncate max-w-[200px]">
                    {trackToDelete.audioFileId || 'None'}
                  </span>
                </div>
                {trackToDelete.thumbnailFileId && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#8E8E96]">Drive Image File ID:</span>
                    <span className="font-mono text-[#C8A464] truncate max-w-[200px]">
                      {trackToDelete.thumbnailFileId}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-[#9A9AA2] leading-relaxed">
                This action will remove the track from PostgreSQL and permanently delete its MP3 file (and uploaded cover image) from your connected Google Drive.
              </p>
            </div>

            <div className="px-5 py-3.5 bg-[#0B0B0E] border-t border-[#222228] flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTrackToDelete(null)}
                className="px-4 py-2 rounded border border-[#2E2E38] text-xs font-semibold text-[#D4D4D8] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTrack}
                className="px-4 py-2 rounded bg-[#D64545] hover:bg-[#E05252] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting from Drive...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Music & Drive File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

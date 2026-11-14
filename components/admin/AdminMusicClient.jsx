'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload';

export default function AdminMusicClient({ initialMusic = [], albums = [] }) {
  const [musicList, setMusicList] = useState(initialMusic);
  const [statusMsg, setStatusMsg] = useState('');
  const [trackToDelete, setTrackToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);

  // Edit Metadata & Cover Photo Modal State
  const [editingTrack, setEditingTrack] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtistName, setEditArtistName] = useState('');
  const [editAlbumId, setEditAlbumId] = useState('');
  const [editAlbumTitle, setEditAlbumTitle] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editReleaseYear, setEditReleaseYear] = useState('');
  const [editComposer, setEditComposer] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editThumbnailFileId, setEditThumbnailFileId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  function openEditModal(track) {
    const albumObj = albums.find((a) => a.id === track.albumId);
    setEditingTrack(track);
    setEditTitle(track.title || '');
    setEditArtistName(track.artistName || 'Masud Hauqe');
    setEditAlbumId(track.albumId || '');
    setEditAlbumTitle(track.albumTitle || albumObj?.title || 'Single');
    setEditGenre(track.genre || albumObj?.genre || '');
    setEditReleaseYear(
      track.releaseYear ||
        albumObj?.releaseYear ||
        (track.createdAt ? String(new Date(track.createdAt).getFullYear()) : String(new Date().getFullYear()))
    );
    setEditComposer(track.composer || track.artistName || 'Masud Hauqe');
    setEditThumbnail(track.thumbnail || albumObj?.coverImage || '');
    setEditThumbnailFileId(track.thumbnailFileId || '');
    setEditError('');
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingTrack || isSavingEdit) return;
    if (!editTitle.trim()) {
      setEditError('Song title is required.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');
    try {
      const selectedAlbum = albums.find((a) => a.id === editAlbumId);
      const resolvedAlbumTitle = selectedAlbum
        ? selectedAlbum.title
        : editAlbumTitle.trim() || 'Single';

      const res = await fetch(`/api/music/${editingTrack.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          artistName: editArtistName.trim() || 'Masud Hauqe',
          albumId: editAlbumId,
          albumTitle: resolvedAlbumTitle,
          genre: editGenre.trim(),
          releaseYear: editReleaseYear.trim(),
          composer: editComposer.trim() || editArtistName.trim() || 'Masud Hauqe',
          thumbnail: editThumbnail.trim(),
          thumbnailFileId: editThumbnailFileId.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMusicList((prev) =>
          prev.map((m) => (m.id === editingTrack.id ? { ...m, ...data.music } : m))
        );
        setStatusMsg(
          `Updated MP3 Cover Photo & ID3 Metadata for "${data.music.title}". Next MP3 or ZIP download will automatically include the new Cover Photo & Tags.`
        );
        setEditingTrack(null);
      } else {
        setEditError(data.error || 'Failed to update metadata.');
      }
    } catch {
      setEditError('Network error while saving metadata.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleField(track, field) {
    const key = `${track.id}:${field}`;
    if (togglingKey === key) return;
    setTogglingKey(key);
    try {
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
    } finally {
      setTogglingKey(null);
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
          Total Records in PostgreSQL: {musicList.length} · All MP3 &amp; ZIP downloads embed ID3v2 Cover Photo &amp; Metadata automatically
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
        <div className="p-3 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg('')}
            className="text-[#BBF7D0] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {musicList.length > 0 ? (
        <div className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#222228] text-[#8E8E96]">
                  <th className="py-3.5 px-4 font-semibold">Track &amp; MP3 Cover</th>
                  <th className="py-3.5 px-4 font-semibold">ID3 Metadata (Artist / Genre / Year)</th>
                  <th className="py-3.5 px-4 font-semibold">Release / Album</th>
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
                  const coverUrl = track.thumbnail || albumObj?.coverImage || '';
                  const displayGenre = track.genre || albumObj?.genre || '—';
                  const displayYear =
                    track.releaseYear ||
                    albumObj?.releaseYear ||
                    (track.createdAt ? new Date(track.createdAt).getFullYear() : '—');
                  return (
                    <tr key={track.id} className="hover:bg-[#15151A]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded bg-[#09090B] border border-[#27272E] overflow-hidden shrink-0 flex items-center justify-center">
                            {coverUrl ? (
                              <Image
                                src={coverUrl}
                                alt={track.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Music className="w-4 h-4 text-[#C8A464]" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-[#F4F1EA]">{track.title}</p>
                            <p className="text-[11px] text-[#8E8E96] font-mono">
                              Drive ID: {track.audioFileId ? `${track.audioFileId.slice(0, 12)}...` : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#B4B4BC]">
                        <p className="font-medium text-[#F4F1EA]">
                          {track.artistName || 'Masud Hauqe'}
                        </p>
                        <p className="text-[11px] text-[#8E8E96]">
                          Genre: <span className="text-[#C8A464]">{displayGenre}</span> · Year:{' '}
                          <span className="tabular-nums">{displayYear}</span>
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[#B4B4BC]">
                        {albumObj?.title || track.albumTitle || 'Single'}
                      </td>
                      <td className="py-3 px-4 text-[#B4B4BC] tabular-nums">
                        {track.duration || '0:00'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          disabled={togglingKey === `${track.id}:isPublished`}
                          onClick={() => toggleField(track, 'isPublished')}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 ${
                            track.isPublished ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
                          }`}
                        >
                          {togglingKey === `${track.id}:isPublished` ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : track.isPublished ? (
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
                          disabled={togglingKey === `${track.id}:downloadEnabled`}
                          onClick={() => toggleField(track, 'downloadEnabled')}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 ${
                            track.downloadEnabled ? 'text-[#C8A464]' : 'text-[#71717A]'
                          }`}
                        >
                          {togglingKey === `${track.id}:downloadEnabled` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{track.downloadEnabled ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {track.youtubeVideoId ? (
                          <button
                            type="button"
                            disabled={togglingKey === `${track.id}:includeYoutubeVideo`}
                            onClick={() => toggleField(track, 'includeYoutubeVideo')}
                            className={`inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-50 ${
                              track.includeYoutubeVideo ? 'text-[#4ADE80]' : 'text-[#71717A]'
                            }`}
                          >
                            {togglingKey === `${track.id}:includeYoutubeVideo` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Video className="w-3.5 h-3.5" />
                            )}
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
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(track)}
                            title="Edit MP3 Cover Photo & ID3 Metadata"
                            className="px-2.5 py-1.5 rounded bg-[#181820] hover:bg-[#23232F] border border-[#2C2C38] hover:border-[#C8A464]/50 text-[#C8A464] text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Metadata &amp; Cover</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrackToDelete(track)}
                            aria-label={`Delete ${track.title}`}
                            className="p-1.5 text-[#9A9AA2] hover:text-[#F87171] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

      {/* Edit MP3 Cover Photo & ID3 Metadata Modal */}
      {editingTrack && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-music-metadata-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-[#111115] border border-[#2C2C36] rounded-xl shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between px-6 py-4 bg-[#15151B] border-b border-[#24242E]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8A464]">
                  MP3 Cover Photo &amp; ID3v2 Tag Editor
                </span>
                <h3 id="edit-music-metadata-title" className="text-base font-bold text-[#F4F1EA]">
                  {editingTrack.title}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setEditingTrack(null)}
                className="p-1.5 rounded border border-[#27272E] text-[#8E8E96] hover:text-white disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="p-3 rounded bg-[#2A1215] border border-[#7F1D1D] text-xs text-[#FECACA]">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5">
                  <DriveImageUpload
                    label="MP3 Cover Photo (APIC Front Cover)"
                    value={editThumbnail}
                    fileId={editThumbnailFileId}
                    aspectClass="aspect-square w-full"
                    helperText="Embedded inside the downloaded MP3 file as its Cover Art."
                    onChange={({ url, fileId }) => {
                      setEditThumbnail(url);
                      setEditThumbnailFileId(fileId);
                    }}
                  />
                </div>

                <div className="md:col-span-7 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                      Song Title (ID3 TIT2) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] focus:border-[#C8A464] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                        Artist Name (ID3 TPE1)
                      </label>
                      <input
                        type="text"
                        value={editArtistName}
                        onChange={(e) => setEditArtistName(e.target.value)}
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] focus:border-[#C8A464] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                        Composer (ID3 TCOM)
                      </label>
                      <input
                        type="text"
                        value={editComposer}
                        onChange={(e) => setEditComposer(e.target.value)}
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] focus:border-[#C8A464] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                        Genre (ID3 TCON)
                      </label>
                      <input
                        type="text"
                        value={editGenre}
                        onChange={(e) => setEditGenre(e.target.value)}
                        placeholder="e.g. Folk, Pop, Acoustic"
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] focus:border-[#C8A464] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                        Release Year (ID3 TYER)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editReleaseYear}
                        onChange={(e) => setEditReleaseYear(e.target.value)}
                        placeholder="e.g. 2026"
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] tabular-nums focus:border-[#C8A464] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                        Assign to Release
                      </label>
                      <select
                        value={editAlbumId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setEditAlbumId(nextId);
                          const found = albums.find((a) => a.id === nextId);
                          if (found) {
                            setEditAlbumTitle(found.title);
                            if (found.coverImage && !editThumbnail) {
                              setEditThumbnail(found.coverImage);
                            }
                          }
                        }}
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] focus:border-[#C8A464] outline-none"
                      >
                        <option value="">Single (No Release)</option>
                        {albums.map((alb) => (
                          <option key={alb.id} value={alb.id}>
                            {alb.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                        ID3 Album Tag (TALB)
                      </label>
                      <input
                        type="text"
                        value={editAlbumTitle}
                        onChange={(e) => setEditAlbumTitle(e.target.value)}
                        placeholder="e.g. Single or Album Name"
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] focus:border-[#C8A464] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222228]">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingTrack(null)}
                  className="px-4 py-2 rounded border border-[#2E2E38] text-xs font-semibold text-[#D4D4D8] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded bg-[#C8A464] hover:bg-[#D4B475] text-[#09090B] text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSavingEdit ? 'Saving Metadata...' : 'Save Cover & ID3 Metadata'}
                  </span>
                </button>
              </div>
            </form>
          </div>
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

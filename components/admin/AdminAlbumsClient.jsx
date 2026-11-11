'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Disc, Eye, EyeOff } from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload.jsx';

export default function AdminAlbumsClient({ initialAlbums = [] }) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverImageFileId, setCoverImageFileId] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          coverImage: coverImage.trim(),
          coverImageFileId: coverImageFileId.trim(),
          releaseDate,
          isPublished,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAlbums((prev) => [{ ...data.album, trackCount: 0 }, ...prev]);
        setTitle('');
        setDescription('');
        setCoverImage('');
        setCoverImageFileId('');
        setReleaseDate('');
        setStatusMsg(`Release "${data.album.title}" created and saved in PostgreSQL.`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(album) {
    const res = await fetch('/api/albums', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: album.id, isPublished: !album.isPublished }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setAlbums((prev) =>
        prev.map((a) => (a.id === album.id ? { ...a, isPublished: data.album.isPublished } : a))
      );
    }
  }

  async function handleDelete(album) {
    const res = await fetch(`/api/albums?id=${encodeURIComponent(album.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setAlbums((prev) => prev.filter((a) => a.id !== album.id));
      setStatusMsg(`Release "${album.title}" deleted.`);
    }
  }

  return (
    <div className="space-y-8">
      {/* Create Release Form */}
      <form
        onSubmit={handleCreate}
        className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-5"
      >
        <h2 className="text-lg font-bold text-[#F4F1EA]">Create Official Release</h2>

        {statusMsg && (
          <div className="p-3 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0]">
            {statusMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="album-title" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Release Title *
            </label>
            <input
              id="album-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nocturnes in Gold"
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label htmlFor="album-date" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Release Date
            </label>
            <input
              id="album-date"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>
        </div>

        <DriveImageUpload
          label="Release Cover Artwork"
          value={coverImage}
          fileId={coverImageFileId}
          aspectClass="aspect-square"
          helperText="Uploads cover artwork to the Google Drive 'Images' folder and stores coverImageFileId in PostgreSQL."
          onChange={({ url, fileId }) => {
            setCoverImage(url);
            setCoverImageFileId(fileId);
          }}
        />

        <div>
          <label htmlFor="album-desc" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
            Release Description & Liner Notes
          </label>
          <textarea
            id="album-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the conceptual theme and instrumentation..."
            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="inline-flex items-center gap-2 text-xs text-[#D4D4D8] cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="accent-[#C8A464]"
            />
            <span>Publish Release Publicly</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Creating...' : 'Create Release'}</span>
          </button>
        </div>
      </form>

      {/* Releases Table */}
      {albums.length > 0 ? (
        <div className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#222228] text-[#8E8E96]">
                <th className="py-3.5 px-4 font-semibold">Release</th>
                <th className="py-3.5 px-4 font-semibold">Slug</th>
                <th className="py-3.5 px-4 font-semibold">Drive Image ID</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C22]">
              {albums.map((album) => (
                <tr key={album.id} className="hover:bg-[#15151A]">
                  <td className="py-3 px-4 font-semibold text-[#F4F1EA]">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded bg-[#09090B] border border-[#27272E] overflow-hidden shrink-0 flex items-center justify-center">
                        {album.coverImage ? (
                          <Image
                            src={album.coverImage}
                            alt={album.title}
                            fill
                            sizes="36px"
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Disc className="w-4 h-4 text-[#C8A464]" />
                        )}
                      </div>
                      <span>{album.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#8E8E96] font-mono">/releases/{album.slug}</td>
                  <td className="py-3 px-4 text-[#C8A464] font-mono">
                    {album.coverImageFileId ? `${album.coverImageFileId.slice(0, 14)}...` : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => togglePublish(album)}
                      className={`inline-flex items-center gap-1.5 font-semibold ${
                        album.isPublished ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
                      }`}
                    >
                      {album.isPublished ? (
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
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(album)}
                      aria-label={`Delete release ${album.title}`}
                      className="p-1.5 text-[#9A9AA2] hover:text-[#F87171]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-10 text-center space-y-2">
          <Disc className="w-8 h-8 text-[#C8A464] mx-auto" />
          <p className="text-sm font-semibold text-[#F4F1EA]">No Releases Created Yet</p>
          <p className="text-xs text-[#8E8E96]">
            Use the form above to create your first official release collection.
          </p>
        </div>
      )}
    </div>
  );
}

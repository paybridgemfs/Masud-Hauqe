'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload.jsx';

export function AdminGalleryManager({ initialGallery = [] }) {
  const [gallery, setGallery] = useState(initialGallery);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFileId, setImageFileId] = useState('');
  const [description, setDescription] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (addingPhoto) return;
    setErrorMsg('');
    setStatusMsg('');
    if (!title.trim() || !imageUrl.trim()) {
      setErrorMsg('Please enter a title and upload a photograph to Google Drive first.');
      return;
    }
    setAddingPhoto(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          group: 'gallery',
          action: 'create',
          item: {
            title: title.trim(),
            imageUrl: imageUrl.trim(),
            imageFileId: imageFileId.trim(),
            description: description.trim(),
            isPublished: true,
          },
        }),
      });
      if (res.ok) {
        const refreshed = await fetch('/api/settings').then((r) => r.json());
        if (refreshed.gallery) setGallery(refreshed.gallery);
        setTitle('');
        setImageUrl('');
        setImageFileId('');
        setDescription('');
        setStatusMsg('Photograph uploaded to Google Drive "Images" folder and saved in Gallery.');
      }
    } finally {
      setAddingPhoto(false);
    }
  }

  async function handleDelete(id) {
    if (deletingId === id) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          group: 'gallery',
          action: 'delete',
          item: { id },
        }),
      });
      if (res.ok) {
        setGallery((prev) => prev.filter((g) => g.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {statusMsg && (
        <div className="p-3 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0]">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded bg-[#2A1215] border border-[#7F1D1D] text-xs text-[#FECACA]">
          {errorMsg}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-5"
      >
        <h2 className="text-lg font-bold text-[#F4F1EA]">Add Gallery Photograph</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
              Photograph Title / Caption *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Photograph Title / Caption"
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
              Location / Photographer Credit
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional location, session, or photographer credit..."
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA]"
            />
          </div>
        </div>

        <DriveImageUpload
          label="Gallery Photograph File"
          value={imageUrl}
          fileId={imageFileId}
          aspectClass="aspect-[4/3]"
          helperText="Uploads directly to the Google Drive 'Images' folder and stores imageFileId in PostgreSQL."
          onChange={({ url, fileId }) => {
            setImageUrl(url);
            setImageFileId(fileId);
          }}
        />

        <button
          type="submit"
          disabled={addingPhoto}
          className="px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {addingPhoto ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{addingPhoto ? 'Publishing...' : 'Publish to Gallery'}</span>
        </button>
      </form>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden"
            >
              <div className="relative aspect-[4/3] bg-[#16161B]">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#F4F1EA] truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-[#8E8E96] truncate">{item.description}</p>
                  )}
                  {item.imageFileId && (
                    <p className="text-[11px] font-mono text-[#C8A464] truncate mt-0.5">
                      ID: {item.imageFileId}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Delete ${item.title}`}
                  className="p-1.5 text-[#9A9AA2] hover:text-[#F87171] disabled:opacity-50"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#F87171]" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-10 text-center space-y-2">
          <ImageIcon className="w-8 h-8 text-[#C8A464] mx-auto" />
          <p className="text-sm font-semibold text-[#F4F1EA]">No Gallery Images Added Yet</p>
          <p className="text-xs text-[#8E8E96]">
            Upload verified studio or performance photographs using the Drive uploader above.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Disc,
  Eye,
  EyeOff,
  UploadCloud,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  X,
  Music,
  Loader2,
  HardDrive,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload.jsx';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function detectAudioDuration(file) {
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };
      audio.onloadedmetadata = () => {
        const secs = Math.round(audio.duration || 0);
        cleanup();
        if (secs > 0 && Number.isFinite(secs)) {
          const mins = Math.floor(secs / 60);
          const rem = secs % 60;
          resolve(`${mins}:${String(rem).padStart(2, '0')}`);
        } else {
          resolve('0:00');
        }
      };
      audio.onerror = () => {
        cleanup();
        resolve('0:00');
      };
      audio.src = objectUrl;
    } catch {
      resolve('0:00');
    }
  });
}

async function verifyClientMp3Header(file) {
  if (!file.name.toLowerCase().endsWith('.mp3')) {
    return { valid: false, reason: `"${file.name}" is not an .mp3 file.` };
  }
  const allowedMimes = ['audio/mpeg', 'audio/mp3', 'application/octet-stream', ''];
  if (!allowedMimes.includes(file.type)) {
    return { valid: false, reason: `"${file.name}" has unsupported MIME type (${file.type}).` };
  }
  try {
    const slice = file.slice(0, 4);
    const buf = new Uint8Array(await slice.arrayBuffer());
    const isId3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
    const isMpeg = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
    if (!isId3 && !isMpeg) {
      return {
        valid: false,
        reason: `"${file.name}" does not have a valid MP3 (ID3v2/MPEG) binary signature.`,
      };
    }
  } catch {
    // Allow server to verify if client slice read fails
  }
  return { valid: true };
}

export default function AdminAlbumsClient({
  initialAlbums = [],
  defaultArtistName = 'Masud Hauqe',
  googleConnected = false,
}) {
  const [albums, setAlbums] = useState(initialAlbums);
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState(defaultArtistName);
  const [genre, setGenre] = useState('');
  const [releaseYear, setReleaseYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverImageFileId, setCoverImageFileId] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Batch MP3 Upload & Track Order Modal State
  const [batchAlbum, setBatchAlbum] = useState(null);
  const [batchArtistName, setBatchArtistName] = useState(defaultArtistName);
  const [batchGenre, setBatchGenre] = useState('');
  const [batchReleaseYear, setBatchReleaseYear] = useState(String(new Date().getFullYear()));
  const [savingReleaseMeta, setSavingReleaseMeta] = useState(false);
  const [batchQueue, setBatchQueue] = useState([]);
  const [batchError, setBatchError] = useState('');
  const [batchPublish, setBatchPublish] = useState(true);
  const [batchDownloadEnabled, setBatchDownloadEnabled] = useState(true);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchSummary, setBatchSummary] = useState('');

  // Drag & Drop State for Existing Release Tracks
  const [draggedTrackIdx, setDraggedTrackIdx] = useState(null);
  const [dragOverTrackIdx, setDragOverTrackIdx] = useState(null);
  const [savingTrackOrder, setSavingTrackOrder] = useState(false);
  const [trackOrderStatus, setTrackOrderStatus] = useState('');
  const [deletingTrackId, setDeletingTrackId] = useState(null);

  // Drag & Drop State for Queue Items (Before Upload)
  const [draggedQueueIdx, setDraggedQueueIdx] = useState(null);
  const [dragOverQueueIdx, setDragOverQueueIdx] = useState(null);

  const batchFileInputRef = useRef(null);
  const activeXhrRef = useRef(null);
  const cancelBatchRef = useRef(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setStatusMsg('');
    try {
      const derivedYear =
        releaseYear.trim() ||
        (releaseDate && /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : String(new Date().getFullYear()));
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          artistName: artistName.trim() || defaultArtistName,
          genre: genre.trim(),
          releaseYear: derivedYear,
          description: description.trim(),
          coverImage: coverImage.trim(),
          coverImageFileId: coverImageFileId.trim(),
          releaseDate,
          isPublished,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAlbums((prev) => [{ ...data.album, tracks: [], trackCount: 0 }, ...prev]);
        setTitle('');
        setDescription('');
        setCoverImage('');
        setCoverImageFileId('');
        setReleaseDate('');
        setGenre('');
        setStatusMsg(`Release "${data.album.title}" created and saved in PostgreSQL.`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(album) {
    if (togglingId === album.id) return;
    setogglingId(album.id);
    try {
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
    } finally {
      setogglingId(null);
    }
  }

  async function handleDelete(album) {
    if (deletingId === album.id) return;
    if (!confirm(`Are you sure you want to delete Release "${album.title}"?`)) return;
    setDeletingId(album.id);
    try {
      const res = await fetch(`/api/albums?id=${encodeURIComponent(album.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setAlbums((prev) => prev.filter((a) => a.id !== album.id));
        setStatusMsg(`Release "${album.title}" deleted.`);
      }
    } finally {
      setDeletingId(null);
    }
  }

  function openBatchUploadModal(album) {
    setBatchAlbum(album);
    setBatchArtistName(album.artistName || defaultArtistName);
    setBatchGenre(album.genre || '');
    setBatchReleaseYear(
      album.releaseYear ||
        (album.releaseDate ? String(album.releaseDate).slice(0, 4) : String(new Date().getFullYear()))
    );
    setBatchQueue([]);
    setBatchError('');
    setBatchSummary('');
    setTrackOrderStatus('');
    setBatchPublish(true);
    setBatchDownloadEnabled(true);
    setIsBatchUploading(false);
    setDraggedTrackIdx(null);
    setDragOverTrackIdx(null);
    setDraggedQueueIdx(null);
    setDragOverQueueIdx(null);
    cancelBatchRef.current = false;
  }

  async function handleSaveReleaseId3Meta() {
    if (!batchAlbum || savingReleaseMeta) return;
    setSavingReleaseMeta(true);
    setTrackOrderStatus('');
    try {
      const res = await fetch('/api/albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: batchAlbum.id,
          artistName: batchArtistName.trim() || defaultArtistName,
          genre: batchGenre.trim(),
          releaseYear: batchReleaseYear.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAlbums((prev) =>
          prev.map((a) =>
            a.id === batchAlbum.id
              ? {
                  ...a,
                  artistName: data.album.artistName,
                  genre: data.album.genre,
                  releaseYear: data.album.releaseYear,
                }
              : a
          )
        );
        setBatchAlbum((prev) =>
          prev
            ? {
                ...prev,
                artistName: data.album.artistName,
                genre: data.album.genre,
                releaseYear: data.album.releaseYear,
              }
            : prev
        );
        setTrackOrderStatus('Release ID3 Metadata (Artist, Genre, Year) saved!');
      }
    } finally {
      setSavingReleaseMeta(false);
    }
  }

  function closeBatchUploadModal() {
    if (isBatchUploading) {
      cancelBatchRef.current = true;
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
        activeXhrRef.current = null;
      }
      setIsBatchUploading(false);
    }
    setBatchAlbum(null);
    setBatchQueue([]);
    setBatchError('');
    setBatchSummary('');
    setTrackOrderStatus('');
  }

  async function handleDeleteReleaseTrack(track) {
    if (!batchAlbum || !track || deletingTrackId === track.id) return;
    setDeletingTrackId(track.id);
    setTrackOrderStatus('');
    try {
      const res = await fetch(`/api/music/${track.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        const remaining = (batchAlbum.tracks || [])
          .filter((t) => t.id !== track.id)
          .map((t, idx) => ({ ...t, trackOrder: idx + 1 }));

        setBatchAlbum((prev) =>
          prev
            ? {
                ...prev,
                tracks: remaining,
                trackCount: remaining.length,
              }
            : prev
        );
        setAlbums((prev) =>
          prev.map((a) =>
            a.id === batchAlbum.id
              ? {
                  ...a,
                  tracks: remaining,
                  trackCount: remaining.length,
                }
              : a
          )
        );
        setTrackOrderStatus(`Deleted track "${track.title}"`);
      } else {
        setTrackOrderStatus('Failed to delete track.');
      }
    } catch {
      setTrackOrderStatus('Network error while deleting track.');
    } finally {
      setDeletingTrackId(null);
    }
  }

  async function persistTrackOrder(albumId, reorderedTracks) {
    setSavingTrackOrder(true);
    setTrackOrderStatus('Saving new track order...');
    try {
      const orderedTrackIds = reorderedTracks.map((t) => t.id);
      const res = await fetch('/api/albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: albumId,
          orderedTrackIds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const finalTracks = Array.isArray(data.tracks) ? data.tracks : reorderedTracks;
        setAlbums((prev) =>
          prev.map((a) =>
            a.id === albumId
              ? { ...a, tracks: finalTracks, trackCount: finalTracks.length }
              : a
          )
        );
        setBatchAlbum((prev) =>
          prev && prev.id === albumId
            ? { ...prev, tracks: finalTracks, trackCount: finalTracks.length }
            : prev
        );
        setTrackOrderStatus('Track serial order saved!');
      } else {
        setTrackOrderStatus('Failed to save track order.');
      }
    } catch {
      setTrackOrderStatus('Network error while saving track order.');
    } finally {
      setSavingTrackOrder(false);
    }
  }

  function reorderExistingTracks(fromIndex, toIndex) {
    if (!batchAlbum || !Array.isArray(batchAlbum.tracks)) return;
    if (
      fromIndex === null ||
      toIndex === null ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= batchAlbum.tracks.length ||
      toIndex >= batchAlbum.tracks.length
    ) {
      return;
    }
    const updated = [...batchAlbum.tracks];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    const reindexed = updated.map((t, idx) => ({ ...t, trackOrder: idx + 1 }));

    setBatchAlbum((prev) => (prev ? { ...prev, tracks: reindexed } : prev));
    setAlbums((prev) =>
      prev.map((a) => (a.id === batchAlbum.id ? { ...a, tracks: reindexed } : a))
    );
    persistTrackOrder(batchAlbum.id, reindexed);
  }

  function reorderQueueItems(fromIndex, toIndex) {
    if (
      fromIndex === null ||
      toIndex === null ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= batchQueue.length ||
      toIndex >= batchQueue.length
    ) {
      return;
    }
    setBatchQueue((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleSelectBatchFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    setBatchError('');
    setBatchSummary('');

    const filesArray = Array.from(fileList);
    const rejectedReasons = [];
    const newItems = [];

    for (const file of filesArray) {
      const check = await verifyClientMp3Header(file);
      if (!check.valid) {
        rejectedReasons.push(check.reason);
        continue;
      }
      const detectedDuration = await detectAudioDuration(file);
      // Exact file name without .mp3 extension as track title
      const exactTrackTitle = file.name.replace(/\.mp3$/i, '').trim() || 'Untitled Track';
      newItems.push({
        uid: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        title: exactTrackTitle,
        duration: detectedDuration || '0:00',
        status: 'ready', // ready | uploading | uploaded | failed
        progress: 0,
        error: '',
      });
    }

    if (rejectedReasons.length > 0) {
      setBatchError(rejectedReasons.join(' '));
    }

    if (newItems.length > 0) {
      setBatchQueue((prev) => [...prev, ...newItems]);
    }
  }

  function updateQueueItemTitle(uid, nextTitle) {
    setBatchQueue((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, title: nextTitle } : item))
    );
  }

  function removeQueueItem(uid) {
    setBatchQueue((prev) => prev.filter((item) => item.uid !== uid));
  }

  function uploadSingleQueuedTrack(item, targetAlbum) {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('mp3File', item.file);
      formData.append(
        'title',
        (item.title || item.fileName.replace(/\.mp3$/i, '')).trim() || 'Track'
      );
      const effectiveArtist =
        batchArtistName.trim() || targetAlbum.artistName || defaultArtistName;
      const effectiveGenre = batchGenre.trim() || targetAlbum.genre || '';
      const effectiveYear =
        batchReleaseYear.trim() ||
        targetAlbum.releaseYear ||
        (targetAlbum.releaseDate ? String(targetAlbum.releaseDate).slice(0, 4) : String(new Date().getFullYear()));

      formData.append('artistName', effectiveArtist);
      formData.append('albumId', targetAlbum.id);
      formData.append('albumTitle', targetAlbum.title || '');
      formData.append('genre', effectiveGenre);
      formData.append('releaseYear', effectiveYear);
      formData.append('composer', effectiveArtist);
      // Automatically use the Release's cover artwork as the track thumbnail & MP3 Cover Photo
      formData.append('thumbnail', targetAlbum.coverImage || '');
      formData.append('thumbnailFileId', targetAlbum.coverImageFileId || '');
      formData.append('youtubeUrl', '');
      formData.append('youtubeVideoId', '');
      formData.append('duration', item.duration || '0:00');
      formData.append('isPublished', String(batchPublish));
      formData.append('downloadEnabled', String(batchDownloadEnabled));
      formData.append('includeYoutubeVideo', 'false');

      const xhr = new XMLHttpRequest();
      activeXhrRef.current = xhr;
      xhr.open('POST', '/api/music', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.min(95, Math.round((event.loaded / event.total) * 100));
          setBatchQueue((prev) =>
            prev.map((q) => (q.uid === item.uid ? { ...q, progress: pct } : q))
          );
        }
      };

      xhr.onload = () => {
        activeXhrRef.current = null;
        try {
          const res = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && res.ok && res.music) {
            setBatchQueue((prev) =>
              prev.map((q) =>
                q.uid === item.uid
                  ? { ...q, status: 'uploaded', progress: 100, error: '' }
                  : q
              )
            );
            resolve({ ok: true, music: res.music });
          } else {
            const errMsg = res.error || 'Upload failed.';
            setBatchQueue((prev) =>
              prev.map((q) =>
                q.uid === item.uid ? { ...q, status: 'failed', error: errMsg } : q
              )
            );
            resolve({ ok: false, error: errMsg });
          }
        } catch {
          const errMsg = 'Unexpected server response during upload.';
          setBatchQueue((prev) =>
            prev.map((q) =>
              q.uid === item.uid ? { ...q, status: 'failed', error: errMsg } : q
            )
          );
          resolve({ ok: false, error: errMsg });
        }
      };

      xhr.onerror = () => {
        activeXhrRef.current = null;
        const errMsg = 'Network interruption during upload.';
        setBatchQueue((prev) =>
          prev.map((q) =>
            q.uid === item.uid ? { ...q, status: 'failed', error: errMsg } : q
          )
        );
        resolve({ ok: false, error: errMsg });
      };

      xhr.onabort = () => {
        activeXhrRef.current = null;
        const errMsg = 'Upload cancelled.';
        setBatchQueue((prev) =>
          prev.map((q) =>
            q.uid === item.uid ? { ...q, status: 'failed', error: errMsg } : q
          )
        );
        resolve({ ok: false, error: errMsg });
      };

      xhr.send(formData);
    });
  }

  async function handleStartBatchUpload() {
    if (!batchAlbum || isBatchUploading) return;
    const pendingItems = batchQueue.filter(
      (item) => item.status === 'ready' || item.status === 'failed'
    );
    if (pendingItems.length === 0) return;

    setIsBatchUploading(true);
    setBatchError('');
    setBatchSummary('');
    cancelBatchRef.current = false;

    let successCount = 0;
    let failCount = 0;
    const newlyUploadedTracks = [];

    for (const item of pendingItems) {
      if (cancelBatchRef.current) break;

      setBatchQueue((prev) =>
        prev.map((q) =>
          q.uid === item.uid ? { ...q, status: 'uploading', progress: 5, error: '' } : q
        )
      );

      const result = await uploadSingleQueuedTrack(item, batchAlbum);
      if (result.ok && result.music) {
        successCount += 1;
        newlyUploadedTracks.push(result.music);
      } else {
        failCount += 1;
      }
    }

    setIsBatchUploading(false);

    if (newlyUploadedTracks.length > 0) {
      setAlbums((prev) =>
        prev.map((alb) => {
          if (alb.id !== batchAlbum.id) return alb;
          const nextTracks = [...(alb.tracks || []), ...newlyUploadedTracks];
          return {
            ...alb,
            tracks: nextTracks,
            trackCount: nextTracks.length,
          };
        })
      );
      setBatchAlbum((prev) => {
        if (!prev) return prev;
        const nextTracks = [...(prev.tracks || []), ...newlyUploadedTracks];
        return {
          ...prev,
          tracks: nextTracks,
          trackCount: nextTracks.length,
        };
      });
    }

    if (successCount > 0 && failCount === 0) {
      setBatchSummary(
        `Successfully uploaded ${successCount} MP3 track${successCount > 1 ? 's' : ''} with Release Cover Photo & ID3 Metadata to "${batchAlbum.title}"!`
      );
      setStatusMsg(
        `Batch uploaded ${successCount} MP3 track${successCount > 1 ? 's' : ''} under Release "${batchAlbum.title}".`
      );
    } else if (successCount > 0 && failCount > 0) {
      setBatchSummary(
        `Uploaded ${successCount} track(s) successfully, ${failCount} failed. You can retry failed files.`
      );
    } else if (failCount > 0) {
      setBatchError(`Batch upload failed for ${failCount} track(s). Check errors below.`);
    }
  }

  const readyOrFailedCount = batchQueue.filter(
    (q) => q.status === 'ready' || q.status === 'failed'
  ).length;
  const uploadedCountInModal = batchQueue.filter((q) => q.status === 'uploaded').length;

  return (
    <div className="space-y-8">
      {/* Create Release Form */}
      <form
        onSubmit={handleCreate}
        className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#F4F1EA]">Create Official Release</h2>
            <p className="text-xs text-[#8E8E96] mt-0.5">
              Create a Release with its Cover Photo and ID3 Metadata (Artist, Genre, Year). Every MP3 uploaded to this Release or downloaded (Single MP3 or Full Release .ZIP) will automatically embed this Cover Photo and Metadata.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0] flex items-center justify-between">
            <span>{statusMsg}</span>
            <button
              type="button"
              onClick={() => setStatusMsg('')}
              className="text-[#BBF7D0] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="album-title" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Release / Album Title (ID3 Album) *
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
            <label htmlFor="album-artist" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Artist Name (ID3 Artist)
            </label>
            <input
              id="album-artist"
              type="text"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="e.g. Masud Hauqe"
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label htmlFor="album-genre" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Genre (ID3 Genre)
            </label>
            <input
              id="album-genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Folk, Pop, Acoustic"
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="album-date" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Release Date
            </label>
            <input
              id="album-date"
              type="date"
              value={releaseDate}
              onChange={(e) => {
                const val = e.target.value;
                setReleaseDate(val);
                if (val && /^\d{4}/.test(val)) {
                  setReleaseYear(val.slice(0, 4));
                }
              }}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label htmlFor="album-year" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Release Year (ID3 Year)
            </label>
            <input
              id="album-year"
              type="text"
              maxLength={4}
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
              placeholder="e.g. 2026"
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA] tabular-nums"
            />
          </div>
        </div>

        <DriveImageUpload
          label="Release Cover Artwork (Also embedded inside all MP3 tracks & ZIP downloads as ID3 Front Cover Photo)"
          value={coverImage}
          fileId={coverImageFileId}
          aspectClass="aspect-square"
          helperText="Uploads cover artwork to the Google Drive 'Images' folder and embeds it as the MP3 Cover Photo."
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
            className="px-5 py-2 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{saving ? 'Creating...' : 'Create Release'}</span>
          </button>
        </div>
      </form>

      {/* Releases Table */}
      {albums.length > 0 ? (
        <div className="bg-[#111115] border border-[#222228] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#222228] text-[#8E8E96]">
                  <th className="py-3.5 px-4 font-semibold">Release &amp; Cover</th>
                  <th className="py-3.5 px-4 font-semibold">ID3 Metadata</th>
                  <th className="py-3.5 px-4 font-semibold">Tracks &amp; Order</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C22]">
                {albums.map((album) => {
                  const count =
                    typeof album.trackCount === 'number'
                      ? album.trackCount
                      : (album.tracks || []).length;
                  return (
                    <tr key={album.id} className="hover:bg-[#15151A]">
                      <td className="py-3.5 px-4 font-semibold text-[#F4F1EA]">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded bg-[#09090B] border border-[#27272E] overflow-hidden shrink-0 flex items-center justify-center">
                            {album.coverImage ? (
                              <Image
                                src={album.coverImage}
                                alt={album.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Disc className="w-4 h-4 text-[#C8A464]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#F4F1EA]">{album.title}</p>
                            <p className="text-[11px] text-[#8E8E96] font-mono">
                              /releases/{album.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#B4B4BC]">
                        <p className="font-medium text-[#F4F1EA]">
                          {album.artistName || defaultArtistName}
                        </p>
                        <p className="text-[11px] text-[#8E8E96]">
                          {album.genre || 'No Genre'} ·{' '}
                          {album.releaseYear ||
                            (album.releaseDate ? String(album.releaseDate).slice(0, 4) : '—')}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => openBatchUploadModal(album)}
                          title="Click to manage tracks or Drag & Drop track serial order"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181820] hover:bg-[#22222C] border border-[#272732] hover:border-[#C8A464]/50 text-[#D4D4D8] font-medium tabular-nums transition-colors"
                        >
                          <Music className="w-3 h-3 text-[#C8A464]" />
                          <span>{count} Tracks</span>
                          {count > 1 && (
                            <span className="text-[10px] text-[#C8A464] ml-1">
                              (Reorder)
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          disabled={togglingId === album.id}
                          onClick={() => togglePublish(album)}
                          className={`inline-flex items-center gap-1.5 font-semibold disabled:opacity-50 ${
                            album.isPublished ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
                          }`}
                        >
                          {togglingId === album.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : album.isPublished ? (
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
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openBatchUploadModal(album)}
                            className="px-3.5 py-1.5 rounded bg-[#C8A464] hover:bg-[#D4B475] text-[#09090B] text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Batch upload</span>
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === album.id}
                            onClick={() => handleDelete(album)}
                            aria-label={`Delete release ${album.title}`}
                            className="p-1.5 rounded border border-[#27272E] text-[#9A9AA2] hover:text-[#F87171] hover:border-[#F87171]/40 transition-colors disabled:opacity-50"
                          >
                            {deletingId === album.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#F87171]" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-10 text-center space-y-2">
          <Disc className="w-8 h-8 text-[#C8A464] mx-auto" />
          <p className="text-sm font-semibold text-[#F4F1EA]">No Releases Created Yet</p>
          <p className="text-xs text-[#8E8E96]">
            Use the form above to create your first official release collection.
          </p>
        </div>
      )}

      {/* ============================================================
          BATCH MP3 UPLOAD & DRAG-AND-DROP TRACK ORDER MODAL
      ============================================================ */}
      {batchAlbum && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-upload-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
        >
          <div className="w-full max-w-3xl bg-[#111115] border border-[#2C2C36] rounded-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 bg-[#15151B] border-b border-[#24242E] flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative w-12 h-12 rounded-lg bg-[#09090B] border border-[#2E2E38] overflow-hidden shrink-0 flex items-center justify-center">
                  {batchAlbum.coverImage ? (
                    <Image
                      src={batchAlbum.coverImage}
                      alt={batchAlbum.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Disc className="w-5 h-5 text-[#C8A464]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#C8A464]/15 text-[#C8A464] border border-[#C8A464]/30">
                      Release Batch Upload &amp; ID3 Metadata
                    </span>
                    <span className="text-xs text-[#8E8E96] tabular-nums">
                      {(batchAlbum.tracks || []).length} tracks
                    </span>
                  </div>
                  <h3
                    id="batch-upload-modal-title"
                    className="text-base sm:text-lg font-bold text-[#F4F1EA] truncate mt-0.5"
                  >
                    {batchAlbum.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={closeBatchUploadModal}
                aria-label="Close batch upload modal"
                className="p-2 rounded-lg border border-[#27272E] text-[#9A9AA2] hover:text-white hover:border-[#3E3E4A] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Automatic Rules Info Banner */}
              <div className="p-3.5 rounded-lg bg-[#0D0D11] border border-[#24242E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 text-[#B4B4BC]">
                  <p className="font-semibold text-[#F4F1EA]">
                    Automatic Release MP3 Cover Photo &amp; ID3v2 Tagging:
                  </p>
                  <p>
                    • <strong className="text-[#C8A464]">MP3 Cover Photo:</strong> এই Release-এর থাম্বনেইলটি প্রতিটি গানের ভেতরে MP3 Cover Art (APIC) হিসেবে সেট হবে।
                  </p>
                  <p>
                    • <strong className="text-[#C8A464]">ID3 Metadata:</strong> ডাউনলোড করা MP3 বা ZIP-এর ভেতরে Artist Name, Album ({batchAlbum.title}), Genre, Year এবং Track Serial অটোমেটিক সেট থাকবে।
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] bg-[#14141A] border border-[#27272E] px-3 py-2 rounded">
                  <HardDrive className="w-4 h-4 text-[#C8A464]" />
                  <span className={googleConnected ? 'text-[#4ADE80]' : 'text-[#FBBF24]'}>
                    {googleConnected ? 'Drive Connected' : 'Drive Not Connected'}
                  </span>
                </div>
              </div>

              {/* Editable Release-Level ID3v2 Metadata Bar */}
              <div className="p-4 rounded-lg bg-[#0B0B0E] border border-[#24242E] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#F4F1EA]">
                    Release ID3v2 Metadata (Applied to Batch Uploads &amp; Release ZIP Downloads)
                  </p>
                  <button
                    type="button"
                    disabled={savingReleaseMeta}
                    onClick={handleSaveReleaseId3Meta}
                    className="px-3 py-1 rounded bg-[#1E1E26] hover:bg-[#2A2A35] border border-[#C8A464]/40 text-[11px] font-semibold text-[#C8A464] inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingReleaseMeta && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{savingReleaseMeta ? 'Saving...' : 'Save Metadata'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                      Artist Name (ID3 Artist)
                    </label>
                    <input
                      type="text"
                      value={batchArtistName}
                      onChange={(e) => setBatchArtistName(e.target.value)}
                      placeholder="e.g. Masud Hauqe"
                      className="w-full bg-[#131318] border border-[#272730] focus:border-[#C8A464] rounded px-2.5 py-1.5 text-xs text-[#F4F1EA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                      Genre (ID3 Genre)
                    </label>
                    <input
                      type="text"
                      value={batchGenre}
                      onChange={(e) => setBatchGenre(e.target.value)}
                      placeholder="e.g. Folk, Acoustic, Pop"
                      className="w-full bg-[#131318] border border-[#272730] focus:border-[#C8A464] rounded px-2.5 py-1.5 text-xs text-[#F4F1EA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#A1A1AA] mb-1">
                      Year (ID3 Year)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={batchReleaseYear}
                      onChange={(e) => setBatchReleaseYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full bg-[#131318] border border-[#272730] focus:border-[#C8A464] rounded px-2.5 py-1.5 text-xs text-[#F4F1EA] tabular-nums outline-none"
                    />
                  </div>
                </div>
              </div>

              {!googleConnected && (
                <div className="p-3.5 rounded-lg bg-[#2A1F0D] border border-[#854D0E] text-xs text-[#FDE68A] flex items-center justify-between gap-3">
                  <span>
                    Google Drive is not connected yet. Connect Google Drive first to upload MP3 files.
                  </span>
                  <Link
                    href="/admin/integrations/google-drive"
                    className="font-bold underline text-[#C8A464] shrink-0"
                  >
                    Connect Drive →
                  </Link>
                </div>
              )}

              {/* Multi-MP3 Drag & Drop Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (isBatchUploading) return;
                  if (e.dataTransfer?.files?.length) {
                    handleSelectBatchFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => {
                  if (!isBatchUploading) batchFileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isBatchUploading) {
                    e.preventDefault();
                    batchFileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-6 sm:p-7 text-center transition-colors ${
                  isBatchUploading
                    ? 'border-[#27272E] bg-[#0B0B0E]/50 opacity-60 cursor-not-allowed'
                    : 'border-[#32323E] hover:border-[#C8A464] bg-[#0B0B0E] cursor-pointer'
                }`}
              >
                <input
                  ref={batchFileInputRef}
                  type="file"
                  accept=".mp3,audio/mpeg"
                  multiple
                  onChange={(e) => {
                    handleSelectBatchFiles(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-[#C8A464] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#F4F1EA]">
                  Click to select multiple MP3 files, or drag &amp; drop them here
                </p>
                <p className="text-xs text-[#8E8E96] mt-1">
                  Select 2, 5, 10 or more .mp3 files together · Track names &amp; durations are extracted automatically
                </p>
              </div>

              {batchError && (
                <div className="p-3.5 rounded-lg bg-[#2A1215] border border-[#7F1D1D] text-xs text-[#FECACA] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
                  <span>{batchError}</span>
                </div>
              )}

              {batchSummary && (
                <div className="p-3.5 rounded-lg bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                  <span>{batchSummary}</span>
                </div>
              )}

              {/* Selected MP3 Files Queue (with Drag & Drop Reorder before upload) */}
              {batchQueue.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#F4F1EA]">
                      Selected MP3 Files Queue ({batchQueue.length}) ·{' '}
                      <span className="text-[#C8A464]">Drag &amp; Drop to arrange serial</span> ·{' '}
                      <span className="text-[#4ADE80]">{uploadedCountInModal} Uploaded</span>
                    </span>
                    {!isBatchUploading && (
                      <button
                        type="button"
                        onClick={() => setBatchQueue([])}
                        className="text-[#9A9AA2] hover:text-[#F87171] transition-colors"
                      >
                        Clear Queue
                      </button>
                    )}
                  </div>

                  <div className="border border-[#24242E] rounded-lg divide-y divide-[#1C1C24] bg-[#0B0B0E] max-h-64 overflow-y-auto">
                    {batchQueue.map((item, idx) => {
                      const isDraggingThis = draggedQueueIdx === idx;
                      const isOverThis = dragOverQueueIdx === idx && draggedQueueIdx !== idx;
                      return (
                        <div
                          key={item.uid}
                          draggable={!isBatchUploading}
                          onDragStart={() => {
                            if (!isBatchUploading) setDraggedQueueIdx(idx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!isBatchUploading && dragOverQueueIdx !== idx) {
                              setDragOverQueueIdx(idx);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (!isBatchUploading && draggedQueueIdx !== null) {
                              reorderQueueItems(draggedQueueIdx, idx);
                            }
                            setDraggedQueueIdx(null);
                            setDragOverQueueIdx(null);
                          }}
                          onDragEnd={() => {
                            setDraggedQueueIdx(null);
                            setDragOverQueueIdx(null);
                          }}
                          className={`p-3 space-y-2 transition-colors ${
                            isDraggingThis
                              ? 'opacity-50 bg-[#181822]'
                              : isOverThis
                                ? 'bg-[#1D1912] border-t-2 border-t-[#C8A464]'
                                : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                title="Drag to reorder track serial"
                                className="text-[#6E6E77] hover:text-[#C8A464] cursor-grab active:cursor-grabbing shrink-0"
                              >
                                <GripVertical className="w-4 h-4" />
                              </span>
                              <span className="text-[11px] font-mono text-[#C8A464] font-bold w-6 shrink-0">
                                #{String(idx + 1).padStart(2, '0')}
                              </span>
                              <FileAudio className="w-4 h-4 text-[#C8A464] shrink-0" />
                              <div className="min-w-0 flex-1">
                                <input
                                  type="text"
                                  value={item.title}
                                  disabled={
                                    isBatchUploading || item.status === 'uploaded'
                                  }
                                  onChange={(e) =>
                                    updateQueueItemTitle(item.uid, e.target.value)
                                  }
                                  aria-label="Track title from MP3 filename"
                                  className="w-full bg-[#131318] border border-[#272730] focus:border-[#C8A464] rounded px-2.5 py-1 text-xs font-semibold text-[#F4F1EA] outline-none disabled:opacity-70"
                                />
                                <p className="text-[10px] text-[#8E8E96] mt-0.5 truncate tabular-nums">
                                  File: {item.fileName} · {formatBytes(item.fileSize)} · Duration:{' '}
                                  {item.duration}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isBatchUploading && batchQueue.length > 1 && (
                                <div className="flex items-center gap-0.5 mr-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => reorderQueueItems(idx, idx - 1)}
                                    title="Move track up"
                                    className="p-1 rounded text-[#8E8E96] hover:text-[#F4F1EA] disabled:opacity-25"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === batchQueue.length - 1}
                                    onClick={() => reorderQueueItems(idx, idx + 1)}
                                    title="Move track down"
                                    className="p-1 rounded text-[#8E8E96] hover:text-[#F4F1EA] disabled:opacity-25"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              {item.status === 'ready' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1E1E26] text-[#B4B4BC]">
                                  Ready
                                </span>
                              )}
                              {item.status === 'uploading' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#C8A464]/20 text-[#C8A464]">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>{item.progress}%</span>
                                </span>
                              )}
                              {item.status === 'uploaded' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#166534]/25 text-[#4ADE80]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Saved</span>
                                </span>
                              )}
                              {item.status === 'failed' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#7F1D1D]/40 text-[#FCA5A5]">
                                  Failed
                                </span>
                              )}

                              {!isBatchUploading && item.status !== 'uploaded' && (
                                <button
                                  type="button"
                                  onClick={() => removeQueueItem(item.uid)}
                                  aria-label={`Remove ${item.fileName}`}
                                  className="p-1 text-[#8E8E96] hover:text-[#F87171]"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {item.status === 'uploading' && (
                            <div className="w-full h-1.5 bg-[#1A1A22] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#C8A464] transition-all duration-150"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}

                          {item.error && (
                            <p className="text-[11px] text-[#F87171] pl-8">{item.error}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Batch Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center justify-between p-3 rounded-lg bg-[#0B0B0E] border border-[#24242E] cursor-pointer text-xs">
                  <div>
                    <p className="font-semibold text-[#F4F1EA]">Publish Tracks Immediately</p>
                    <p className="text-[11px] text-[#8E8E96]">
                      Make all uploaded tracks live under this Release
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={batchPublish}
                    disabled={isBatchUploading}
                    onChange={(e) => setBatchPublish(e.target.checked)}
                    className="w-4 h-4 accent-[#C8A464]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-[#0B0B0E] border border-[#24242E] cursor-pointer text-xs">
                  <div>
                    <p className="font-semibold text-[#F4F1EA]">Enable Public MP3 Download</p>
                    <p className="text-[11px] text-[#8E8E96]">
                      Visitors can download each track or the full Release (.ZIP)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={batchDownloadEnabled}
                    disabled={isBatchUploading}
                    onChange={(e) => setBatchDownloadEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#C8A464]"
                  />
                </label>
              </div>

              {/* Existing Tracks in this Release — DRAG & DROP TRACK ORDER + DELETE TRACK */}
              {(batchAlbum.tracks || []).length > 0 && (
                <div className="pt-3 border-t border-[#202028] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#F4F1EA]">
                        Release Tracklist &amp; Serial Order ({batchAlbum.tracks.length} Tracks)
                      </p>
                      <p className="text-[11px] text-[#8E8E96]">
                        মাউস দিয়ে টেনে (Drag &amp; Drop করে) গানের ১, ২, ৩ সিরিয়াল সাজান অথবা ডিলিট বাটনে ক্লিক করে গান মুছুন
                      </p>
                    </div>
                    {trackOrderStatus && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181820] border border-[#C8A464]/35 text-[11px] font-semibold text-[#C8A464]">
                        {savingTrackOrder || deletingTrackId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-[#4ADE80]" />
                        )}
                        <span>{trackOrderStatus}</span>
                      </span>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-[#24242E] bg-[#0B0B0E] divide-y divide-[#18181F] text-xs">
                    {batchAlbum.tracks.map((t, i) => {
                      const isDragging = draggedTrackIdx === i;
                      const isDragOver = dragOverTrackIdx === i && draggedTrackIdx !== i;
                      const isDeletingThis = deletingTrackId === t.id;
                      return (
                        <div
                          key={t.id}
                          draggable={!savingTrackOrder && !isDeletingThis}
                          onDragStart={() => {
                            setDraggedTrackIdx(i);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverTrackIdx !== i) {
                              setDragOverTrackIdx(i);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedTrackIdx !== null && draggedTrackIdx !== i) {
                              reorderExistingTracks(draggedTrackIdx, i);
                            }
                            setDraggedTrackIdx(null);
                            setDragOverTrackIdx(null);
                          }}
                          onDragEnd={() => {
                            setDraggedTrackIdx(null);
                            setDragOverTrackIdx(null);
                          }}
                          className={`px-3 py-2.5 flex items-center justify-between gap-3 text-[#D4D4D8] select-none transition-colors ${
                            isDragging
                              ? 'opacity-45 bg-[#181822]'
                              : isDragOver
                                ? 'bg-[#1D1912] border-t-2 border-t-[#C8A464]'
                                : 'hover:bg-[#13131A]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              title="Drag & Drop to change track serial"
                              className="text-[#6E6E77] hover:text-[#C8A464] cursor-grab active:cursor-grabbing shrink-0"
                            >
                              <GripVertical className="w-4 h-4" />
                            </span>
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#16161E] border border-[#272732] text-[#C8A464] font-mono text-[11px] font-bold shrink-0">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="truncate font-semibold text-[#F4F1EA]">
                              {t.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-[#8E8E96] tabular-nums">
                              {t.duration || '0:00'}
                            </span>

                            {batchAlbum.tracks.length > 1 && (
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={i === 0 || savingTrackOrder || isDeletingThis}
                                  onClick={() => reorderExistingTracks(i, i - 1)}
                                  title="Move track up"
                                  className="p-1 rounded border border-[#24242E] text-[#8E8E96] hover:text-[#F4F1EA] hover:border-[#C8A464]/40 disabled:opacity-25 transition-colors"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    i === batchAlbum.tracks.length - 1 ||
                                    savingTrackOrder ||
                                    isDeletingThis
                                  }
                                  onClick={() => reorderExistingTracks(i, i + 1)}
                                  title="Move track down"
                                  className="p-1 rounded border border-[#24242E] text-[#8E8E96] hover:text-[#F4F1EA] hover:border-[#C8A464]/40 disabled:opacity-25 transition-colors"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={isDeletingThis || savingTrackOrder}
                              onClick={() => handleDeleteReleaseTrack(t)}
                              title={`Delete track "${t.title}"`}
                              aria-label={`Delete track ${t.title}`}
                              className="p-1.5 rounded border border-[#27272E] text-[#9A9AA2] hover:text-[#F87171] hover:border-[#F87171]/40 disabled:opacity-50 transition-colors"
                            >
                              {isDeletingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F87171]" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-4 bg-[#15151B] border-t border-[#24242E] flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-[#8E8E96]">
                {isBatchUploading
                  ? 'Uploading MP3 files to Google Drive & PostgreSQL...'
                  : readyOrFailedCount > 0
                    ? `${readyOrFailedCount} MP3 file(s) ready to upload`
                    : 'Select .mp3 files above or drag tracks to reorder'}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={closeBatchUploadModal}
                  className="px-4 py-2 rounded border border-[#2E2E38] text-xs font-semibold text-[#D4D4D8] hover:text-white transition-colors"
                >
                  {isBatchUploading ? 'Cancel & Close' : 'Close'}
                </button>

                <button
                  type="button"
                  disabled={isBatchUploading || readyOrFailedCount === 0}
                  onClick={handleStartBatchUpload}
                  className="px-5 py-2 rounded bg-[#C8A464] hover:bg-[#D4B475] text-[#09090B] text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow"
                >
                  {isBatchUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading Batch...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>
                        Start Batch Upload ({readyOrFailedCount})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Youtube,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Plus,
  X,
  HardDrive,
} from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AddMusicClient({
  defaultArtistName = 'Masud Hauqe',
  initialAlbums = [],
  googleConnected = false,
  youtubeConfigured = false,
}) {
  const router = useRouter();
  const [albums, setAlbums] = useState(initialAlbums);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [fetchingYt, setFetchingYt] = useState(false);
  const [ytStatus, setYtStatus] = useState(null);

  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState(defaultArtistName);
  const [thumbnail, setThumbnail] = useState('');
  const [thumbnailFileId, setThumbnailFileId] = useState('');
  const [duration, setDuration] = useState('0:00');
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [channelTitle, setChannelTitle] = useState('');

  const [albumId, setAlbumId] = useState('');
  const [showNewAlbumModal, setShowNewAlbumModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  const [isPublished, setIsPublished] = useState(true);
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [includeYoutubeVideo, setIncludeYoutubeVideo] = useState(false);

  const [mp3File, setMp3File] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploadLifecycle, setUploadLifecycle] = useState('idle'); // idle | pending | uploading | uploaded | published | failed
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitStatus, setSubmitStatus] = useState(null);

  const xhrRef = useRef(null);
  const fileInputRef = useRef(null);

  async function handleFetchYouTube() {
    if (!youtubeUrl.trim()) {
      setYtStatus({ type: 'error', text: 'Please paste a YouTube video URL first.' });
      return;
    }
    setFetchingYt(true);
    setYtStatus(null);

    try {
      const res = await fetch('/api/integrations/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setYtStatus({
          type: 'error',
          text: data.error || 'Failed to retrieve YouTube metadata.',
        });
      } else {
        const meta = data.metadata;
        setTitle(meta.title || '');
        setArtistName(meta.artistName || defaultArtistName);
        setThumbnail(meta.thumbnail || '');
        setThumbnailFileId('');
        setDuration(meta.duration || '0:00');
        setYoutubeVideoId(meta.youtubeVideoId || '');
        setChannelTitle(meta.channelTitle || '');
        setYoutubeUrl(meta.youtubeUrl || youtubeUrl);
        setYtStatus({
          type: 'success',
          text: 'YouTube metadata retrieved and populated automatically.',
        });
      }
    } catch {
      setYtStatus({
        type: 'error',
        text: 'Network error while contacting server YouTube metadata endpoint.',
      });
    } finally {
      setFetchingYt(false);
    }
  }

  async function validateAndSelectMp3(file) {
    setFileError('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setFileError('Only .mp3 files are accepted.');
      setMp3File(null);
      return;
    }

    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'application/octet-stream', ''];
    if (!allowedMimes.includes(file.type)) {
      setFileError(`Invalid MIME type "${file.type}". Please select a genuine MP3 file.`);
      setMp3File(null);
      return;
    }

    // Client-side binary header check (ID3 or 0xFF MPEG sync)
    try {
      const slice = file.slice(0, 4);
      const buf = new Uint8Array(await slice.arrayBuffer());
      const isId3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
      const isMpeg = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
      if (!isId3 && !isMpeg) {
        setFileError(
          'File signature check failed: Selected file does not have a valid ID3v2 or MPEG audio frame header.'
        );
        setMp3File(null);
        return;
      }
    } catch {
      // Proceed to server verification if slice read fails
    }

    setMp3File(file);
    setUploadLifecycle('pending');
  }

  async function handleQuickCreateAlbum(e) {
    e.preventDefault();
    if (!newAlbumTitle.trim()) return;
    setCreatingAlbum(true);
    try {
      const res = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newAlbumTitle.trim(), isPublished: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.album) {
        setAlbums((prev) => [data.album, ...prev]);
        setAlbumId(data.album.id);
        setNewAlbumTitle('');
        setShowNewAlbumModal(false);
      }
    } finally {
      setCreatingAlbum(false);
    }
  }

  function handleCancelUpload() {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
      setUploadLifecycle('idle');
      setUploadProgress(0);
      setSubmitStatus({ type: 'error', text: 'MP3 upload was cancelled by administrator.' });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitStatus(null);

    if (!title.trim()) {
      setSubmitStatus({ type: 'error', text: 'Song title is required.' });
      return;
    }

    if (!mp3File) {
      setSubmitStatus({
        type: 'error',
        text: 'Please select an original/authorized MP3 file to upload to Google Drive.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('mp3File', mp3File);
    formData.append('title', title.trim());
    formData.append('artistName', artistName.trim() || defaultArtistName);
    formData.append('albumId', albumId || '');
    formData.append('thumbnail', thumbnail.trim());
    formData.append('thumbnailFileId', thumbnailFileId.trim());
    formData.append('youtubeUrl', youtubeUrl.trim());
    formData.append('youtubeVideoId', youtubeVideoId.trim());
    formData.append('duration', duration.trim() || '0:00');
    formData.append('isPublished', String(isPublished));
    formData.append('downloadEnabled', String(downloadEnabled));
    formData.append('includeYoutubeVideo', String(includeYoutubeVideo));

    setUploadLifecycle('uploading');
    setUploadProgress(5);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', '/api/music', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(95, Math.round((event.loaded / event.total) * 100));
        setUploadProgress(pct);
      }
    };

    xhr.onload = () => {
      xhrRef.current = null;
      try {
        const res = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && res.ok) {
          setUploadProgress(100);
          setUploadLifecycle(isPublished ? 'published' : 'uploaded');
          setSubmitStatus({
            type: 'success',
            text: `Track "${res.music.title}" successfully uploaded to Google Drive ("Musics" folder) and saved in PostgreSQL.`,
          });
          router.refresh();
        } else {
          setUploadLifecycle('failed');
          setSubmitStatus({
            type: 'error',
            text: res.error || 'Upload & database save failed.',
          });
        }
      } catch {
        setUploadLifecycle('failed');
        setSubmitStatus({ type: 'error', text: 'Unexpected response from server during upload.' });
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setUploadLifecycle('failed');
      setSubmitStatus({ type: 'error', text: 'Network interruption during MP3 upload.' });
    };

    xhr.send(formData);
  }

  return (
    <div className="space-y-8">
      {/* Integration Readiness Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-[#C8A464] shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#F4F1EA]">Google Drive MP3 Storage</p>
              <p className="text-xs text-[#8E8E96]">
                Status:{' '}
                <span className={googleConnected ? 'text-[#4ADE80]' : 'text-[#FBBF24]'}>
                  {googleConnected ? 'Connected & Ready' : 'Not Connected'}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/admin/integrations/google-drive"
            className="text-xs font-semibold text-[#C8A464] hover:underline whitespace-nowrap"
          >
            Configure →
          </Link>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Youtube className="w-5 h-5 text-[#C8A464] shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#F4F1EA]">YouTube Data API v3</p>
              <p className="text-xs text-[#8E8E96]">
                Status:{' '}
                <span className={youtubeConfigured ? 'text-[#4ADE80]' : 'text-[#FBBF24]'}>
                  {youtubeConfigured ? 'API Key Active' : 'YOUTUBE_API_KEY Not Set in .env'}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/admin/integrations/google-drive"
            className="text-xs font-semibold text-[#C8A464] hover:underline whitespace-nowrap"
          >
            Details →
          </Link>
        </div>
      </div>

      {/* Step 1: YouTube URL Metadata Fetch */}
      <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#C8A464]">STEP 1</p>
          <h2 className="text-lg font-bold text-[#F4F1EA]">Fetch YouTube Video Information</h2>
          <p className="text-xs text-[#8E8E96]">
            Paste an official YouTube video URL to automatically retrieve the song title, thumbnail, and duration via YouTube Data API v3.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
            aria-label="YouTube Video URL"
            className="flex-1 bg-[#09090B] border border-[#27272E] rounded px-4 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
          />
          <button
            type="button"
            onClick={handleFetchYouTube}
            disabled={fetchingYt}
            className="px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold tracking-wide transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {fetchingYt ? 'Fetching Metadata...' : 'Fetch Music Information'}
          </button>
        </div>

        {ytStatus && (
          <div
            role="alert"
            className={`p-3.5 rounded border text-xs flex items-start gap-2.5 ${
              ytStatus.type === 'success'
                ? 'bg-[#11261B] border-[#166534] text-[#BBF7D0]'
                : 'bg-[#2A1215] border-[#7F1D1D] text-[#FECACA]'
            }`}
          >
            {ytStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
            )}
            <span>{ytStatus.text}</span>
          </div>
        )}
      </section>

      {/* Main Upload & Metadata Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 2: Automatic Metadata Preview & Editable Fields */}
        <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#C8A464]">STEP 2</p>
            <h2 className="text-lg font-bold text-[#F4F1EA]">
              Automatic Metadata Preview & Track Details
            </h2>
            <p className="text-xs text-[#8E8E96]">
              Review or customize the populated track metadata before uploading your MP3 master.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Thumbnail Preview & Upload */}
            <div className="lg:col-span-4 space-y-2">
              <DriveImageUpload
                label="Track Thumbnail (YouTube Auto-Fill or Custom Upload to Drive)"
                value={thumbnail}
                fileId={thumbnailFileId}
                aspectClass="aspect-video w-full"
                helperText="Auto-populated from YouTube or upload a custom cover into Google Drive 'Images' folder."
                onChange={({ url, fileId }) => {
                  setThumbnail(url);
                  setThumbnailFileId(fileId);
                }}
              />
              {channelTitle && (
                <p className="text-[11px] text-[#8E8E96]">
                  Source YouTube Channel: <span className="text-[#D4D4D8]">{channelTitle}</span>
                </p>
              )}
            </div>

            {/* Editable Metadata Fields */}
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="track-title" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                    Song Title *
                  </label>
                  <input
                    id="track-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Song title"
                    className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                  />
                </div>

                <div>
                  <label htmlFor="track-artist" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                    Artist Name
                  </label>
                  <input
                    id="track-artist"
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="track-duration" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                    Duration
                  </label>
                  <input
                    id="track-duration"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 4:12"
                    className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA] tabular-nums focus:outline-none focus:border-[#C8A464]"
                  />
                </div>

                <div>
                  <label htmlFor="track-yt-id" className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                    YouTube Video ID
                  </label>
                  <input
                    id="track-yt-id"
                    type="text"
                    value={youtubeVideoId}
                    onChange={(e) => setYoutubeVideoId(e.target.value)}
                    placeholder="Auto-extracted ID"
                    className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA] font-mono focus:outline-none focus:border-[#C8A464]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: MP3 Drag-and-Drop Upload */}
        <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#C8A464]">STEP 3</p>
            <h2 className="text-lg font-bold text-[#F4F1EA]">
              Authorized MP3 Master Upload (Google Drive Storage)
            </h2>
            <p className="text-xs text-[#8E8E96]">
              Upload the original or authorized MP3 file. We validate the file extension, MIME type, and binary ID3/MPEG header signature before uploading to Google Drive.
            </p>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer?.files?.[0];
              if (dropped) validateAndSelectMp3(dropped);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Select or drag and drop MP3 file"
            className="border-2 border-dashed border-[#2E2E38] hover:border-[#C8A464] rounded-lg p-8 text-center cursor-pointer transition-colors bg-[#0B0B0E]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(e) => validateAndSelectMp3(e.target.files?.[0])}
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 text-[#C8A464] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#F4F1EA]">
              Drag and drop your MP3 master here, or click to browse
            </p>
            <p className="text-xs text-[#8E8E96] mt-1">
              Accepted format: .mp3 (audio/mpeg) · Validated binary signature
            </p>
          </div>

          {fileError && (
            <div className="p-3.5 rounded bg-[#2A1215] border border-[#7F1D1D] text-xs text-[#FECACA] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {mp3File && (
            <div className="bg-[#09090B] border border-[#27272E] rounded p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileAudio className="w-5 h-5 text-[#C8A464] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#F4F1EA] truncate">{mp3File.name}</p>
                  <p className="text-xs text-[#8E8E96] tabular-nums">
                    {formatBytes(mp3File.size)} · Status: {uploadLifecycle.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMp3File(null);
                  setUploadLifecycle('idle');
                }}
                aria-label="Remove selected MP3 file"
                className="p-1.5 text-[#9A9AA2] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploadLifecycle === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#C8A464] font-semibold">
                  Uploading to Google Drive... {uploadProgress}%
                </span>
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="text-[#FCA5A5] hover:underline font-medium"
                >
                  Cancel Upload
                </button>
              </div>
              <div className="w-full h-2 bg-[#1E1E24] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C8A464] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Step 4 & Step 5: Release Selection & Publishing Options */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#C8A464]">STEP 4</p>
            <h2 className="text-lg font-bold text-[#F4F1EA]">Release Assignment</h2>
            <div className="space-y-3">
              <select
                aria-label="Select release"
                value={albumId}
                onChange={(e) => setAlbumId(e.target.value)}
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
              >
                <option value="">Single Track (No Release)</option>
                {albums.map((alb) => (
                  <option key={alb.id} value={alb.id}>
                    {alb.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowNewAlbumModal(!showNewAlbumModal)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8A464] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Release Inline</span>
              </button>

              {showNewAlbumModal && (
                <div className="p-3.5 rounded bg-[#09090B] border border-[#27272E] space-y-2.5">
                  <input
                    type="text"
                    value={newAlbumTitle}
                    onChange={(e) => setNewAlbumTitle(e.target.value)}
                    placeholder="New Release Title"
                    className="w-full bg-[#111115] border border-[#27272E] rounded px-3 py-1.5 text-xs text-[#F4F1EA]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickCreateAlbum}
                      disabled={creatingAlbum}
                      className="px-3 py-1.5 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold"
                    >
                      {creatingAlbum ? 'Creating...' : 'Save Release'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewAlbumModal(false)}
                      className="px-3 py-1.5 rounded border border-[#2E2E38] text-xs text-[#9A9AA2]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#C8A464]">STEP 5</p>
            <h2 className="text-lg font-bold text-[#F4F1EA]">Publishing & Download Controls</h2>

            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between p-3 rounded bg-[#09090B] border border-[#27272E] cursor-pointer">
                <div>
                  <p className="font-semibold text-[#F4F1EA]">Publish Immediately</p>
                  <p className="text-xs text-[#8E8E96]">
                    Uncheck to save as Draft in PostgreSQL
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-[#C8A464]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded bg-[#09090B] border border-[#27272E] cursor-pointer">
                <div>
                  <p className="font-semibold text-[#F4F1EA]">Enable Public MP3 Download</p>
                  <p className="text-xs text-[#8E8E96]">
                    Controls whether visitors see the MP3 download button
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={downloadEnabled}
                  onChange={(e) => setDownloadEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#C8A464]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded bg-[#09090B] border border-[#27272E] cursor-pointer">
                <div>
                  <p className="font-semibold text-[#F4F1EA]">Add also YouTube video</p>
                  <p className="text-xs text-[#8E8E96]">
                    When checked, this track&apos;s YouTube video will appear in Official Video Performances
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={includeYoutubeVideo}
                  onChange={(e) => setIncludeYoutubeVideo(e.target.checked)}
                  className="w-4 h-4 accent-[#C8A464]"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Step 6: Submit & Status */}
        {submitStatus && (
          <div
            role="alert"
            className={`p-4 rounded border text-sm flex items-start gap-3 ${
              submitStatus.type === 'success'
                ? 'bg-[#11261B] border-[#166534] text-[#BBF7D0]'
                : 'bg-[#2A1215] border-[#7F1D1D] text-[#FECACA]'
            }`}
          >
            {submitStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#F87171] shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p>{submitStatus.text}</p>
              {submitStatus.type === 'success' && (
                <Link href="/admin/music" className="text-xs font-semibold underline inline-block">
                  View in Admin Music List →
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/music"
            className="px-5 py-2.5 rounded border border-[#2E2E38] text-xs font-semibold text-[#D4D4D8] hover:text-white"
          >
            Back to All Music
          </Link>
          <button
            type="submit"
            disabled={uploadLifecycle === 'uploading'}
            className="px-6 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {uploadLifecycle === 'uploading'
              ? 'Uploading MP3...'
              : isPublished
              ? 'Upload & Publish Music'
              : 'Upload & Save as Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}

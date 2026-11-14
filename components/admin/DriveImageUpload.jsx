'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function DriveImageUpload({
  label = 'Upload Image',
  value = '',
  fileId = '',
  onChange,
  helperText = 'Uploads directly to the Google Drive "Images" folder and saves the Drive file ID.',
  aspectClass = 'aspect-video',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);

  const resolvedPreviewUrl = value || (fileId ? `/api/media/${fileId}` : '');

  async function handleFileSelect(file) {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('imageFile', file);
      if (fileId) {
        formData.append('previousFileId', fileId);
      }

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(
          data.error ||
            'Failed to upload image to Google Drive. Make sure Google Drive is connected in Admin > Integrations.'
        );
      } else {
        onChange({
          url: data.url,
          fileId: data.fileId,
        });
      }
    } catch {
      setError('Network error while uploading image to Google Drive.');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  async function handleClear() {
    setError(null);
    const oldFileId = fileId;
    onChange({ url: '', fileId: '' });

    if (oldFileId) {
      setRemoving(true);
      try {
        await fetch(`/api/upload/image?fileId=${encodeURIComponent(oldFileId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch {
        // Non-blocking cleanup
      } finally {
        setRemoving(false);
      }
    }
  }

  return (
    <div className="space-y-2.5">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold">
            {label}
          </label>
          {fileId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#2E9B68]">
              <CheckCircle2 className="w-3 h-3" />
              <span>Drive ID: {fileId.slice(0, 14)}...</span>
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start bg-[#09090B] border border-[#F4F1EA]/[0.1] rounded p-3.5">
        {/* Image Preview Box */}
        <div
          className={`sm:col-span-5 relative w-full ${aspectClass} bg-[#111115] border border-[#F4F1EA]/[0.08] rounded overflow-hidden flex items-center justify-center`}
        >
          {resolvedPreviewUrl ? (
            <Image
              src={resolvedPreviewUrl}
              alt={label || 'Uploaded preview'}
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-center p-4">
              <ImageIcon className="w-6 h-6 text-[#68645E] mx-auto mb-1.5" />
              <p className="text-[11px] text-[#68645E]">No image uploaded</p>
            </div>
          )}
        </div>

        {/* Upload Trigger & Metadata */}
        <div className="sm:col-span-7 space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,image/x-icon"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={uploading || removing}
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2.5 bg-[#18181F] hover:bg-[#C8A464] hover:text-[#09090B] disabled:opacity-50 text-[#F4F1EA] border border-[#F4F1EA]/[0.14] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading to Drive (&quot;Images&quot;)...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{resolvedPreviewUrl ? 'Replace Image' : 'Upload Image to Drive'}</span>
                </>
              )}
            </button>

            {resolvedPreviewUrl && !uploading && (
              <button
                type="button"
                disabled={removing}
                onClick={handleClear}
                className="px-3 py-2.5 bg-[#D64545]/10 hover:bg-[#D64545]/20 text-[#D64545] border border-[#D64545]/30 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {removing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{removing ? 'Removing...' : 'Remove'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-[#8E8E96] leading-relaxed">{helperText}</p>

          {fileId && (
            <div className="text-[11px] text-[#9E9A90] font-mono bg-[#111115] px-2.5 py-1.5 rounded border border-[#F4F1EA]/[0.06] truncate">
              Saved Image ID: <span className="text-[#C8A464]">{fileId}</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-[#D64545]/10 border border-[#D64545]/30 rounded text-xs text-[#D64545] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

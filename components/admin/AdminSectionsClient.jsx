'use client';

import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload.jsx';

const SECTION_TYPES = [
  { value: 'HERO', label: 'Hero Section' },
  { value: 'ARTIST_INTRO', label: 'Artist Introduction' },
  { value: 'FEATURED_MUSIC', label: 'Featured Music' },
  { value: 'LATEST_RELEASES', label: 'Latest Releases' },
  { value: 'POPULAR_MUSIC', label: 'Popular Music' },
  { value: 'ALBUMS', label: 'Studio Albums' },
  { value: 'BIOGRAPHY_PREVIEW', label: 'Artist Biography Preview' },
  { value: 'MUSIC_VIDEOS', label: 'Music Videos' },
  { value: 'GALLERY', label: 'Visual Gallery' },
  { value: 'SOCIAL_LINKS', label: 'Social Media Links' },
  { value: 'CONTACT_SECTION', label: 'Contact Section' },
];

export default function AdminSectionsClient({ initialSections = [] }) {
  const [sections, setSections] = useState(
    [...initialSections].sort((a, b) => a.position - b.position)
  );
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('FEATURED_MUSIC');
  const [newHeading, setNewHeading] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    name: '',
    heading: '',
    subheading: '',
    kicker: '',
    backgroundImage: '',
    backgroundImageFileId: '',
  });
  const [statusMsg, setStatusMsg] = useState('');

  async function handleAddSection(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        type: newType,
        isVisible: true,
        content: {
          heading: newHeading.trim() || newName.trim(),
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.section) {
      setSections((prev) => [...prev, data.section]);
      setNewName('');
      setNewHeading('');
      setStatusMsg(`Added section "${data.section.name}".`);
    }
  }

  async function handleToggleVisibility(sec) {
    const res = await fetch('/api/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sec.id, isVisible: !sec.isVisible }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setSections((prev) =>
        prev.map((s) => (s.id === sec.id ? { ...s, isVisible: data.section.isVisible } : s))
      );
      setStatusMsg(`Updated visibility for "${sec.name}".`);
    }
  }

  async function handleMove(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    const reindexed = next.map((s, idx) => ({ ...s, position: idx + 1 }));
    setSections(reindexed);

    await fetch('/api/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reindexed.map((s) => s.id) }),
    });
    setStatusMsg('Homepage section order updated.');
  }

  function startEditing(sec) {
    setEditingId(sec.id);
    setEditDraft({
      name: sec.name || '',
      kicker: sec.content?.kicker || '',
      heading: sec.content?.heading || sec.content?.headline || '',
      subheading: sec.content?.subheading || sec.content?.subheadline || '',
      backgroundImage: sec.content?.backgroundImage || '',
      backgroundImageFileId: sec.content?.backgroundImageFileId || '',
    });
  }

  async function saveEditing(sec) {
    const nextContent = {
      ...sec.content,
      kicker: editDraft.kicker,
      heading: editDraft.heading,
      headline: editDraft.heading,
      subheading: editDraft.subheading,
      subheadline: editDraft.subheading,
      backgroundImage: editDraft.backgroundImage || '',
      backgroundImageFileId: editDraft.backgroundImageFileId || '',
    };
    const res = await fetch('/api/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sec.id,
        name: editDraft.name,
        content: nextContent,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setSections((prev) => prev.map((s) => (s.id === sec.id ? data.section : s)));
      setEditingId(null);
      setStatusMsg(`Saved content for "${data.section.name}".`);
    }
  }

  async function handleDelete(sec) {
    const res = await fetch(`/api/sections?id=${encodeURIComponent(sec.id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== sec.id));
      setStatusMsg(`Removed section "${sec.name}".`);
    }
  }

  return (
    <div className="space-y-8">
      {statusMsg && (
        <div className="p-3.5 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0]">
          {statusMsg}
        </div>
      )}

      {/* Add New Homepage Section */}
      <form
        onSubmit={handleAddSection}
        className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4"
      >
        <h2 className="text-lg font-bold text-[#F4F1EA]">Add Dynamic Homepage Section</h2>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Internal Section Label (e.g. Popular Tracks)"
            className="sm:col-span-4 bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA]"
          />
          <select
            aria-label="Section Type"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="sm:col-span-3 bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA]"
          >
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newHeading}
            onChange={(e) => setNewHeading(e.target.value)}
            placeholder="Public Section Heading"
            className="sm:col-span-3 bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA]"
          />
          <button
            type="submit"
            className="sm:col-span-2 px-4 py-2 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Section</span>
          </button>
        </div>
      </form>

      {/* Reorderable Sections List */}
      <div className="space-y-3">
        {sections.map((sec, idx) => {
          const isEditing = editingId === sec.id;
          return (
            <div
              key={sec.id}
              className="bg-[#111115] border border-[#222228] rounded-lg p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#C8A464] tabular-nums w-6">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#F4F1EA]">{sec.name}</p>
                    <p className="text-xs text-[#8E8E96]">
                      Type: {sec.type} · Heading:{' '}
                      {sec.content?.heading || sec.content?.headline || 'Default'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    aria-label={`Move ${sec.name} up`}
                    className="p-1.5 rounded border border-[#27272E] text-[#B4B4BC] hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === sections.length - 1}
                    aria-label={`Move ${sec.name} down`}
                    className="p-1.5 rounded border border-[#27272E] text-[#B4B4BC] hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(sec)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold inline-flex items-center gap-1.5 ${
                      sec.isVisible
                        ? 'border-[#166534] text-[#4ADE80]'
                        : 'border-[#52525B] text-[#A1A1AA]'
                    }`}
                  >
                    {sec.isVisible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => (isEditing ? setEditingId(null) : startEditing(sec))}
                    aria-label={`Edit ${sec.name}`}
                    className="p-1.5 rounded border border-[#27272E] text-[#C8A464] hover:border-[#C8A464]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sec)}
                    aria-label={`Delete ${sec.name}`}
                    className="p-1.5 rounded border border-[#27272E] text-[#9A9AA2] hover:text-[#F87171]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="pt-4 border-t border-[#1E1E24] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#8E8E96] mb-1">Section Name</label>
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-1.5 text-xs text-[#F4F1EA]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8E8E96] mb-1">Kicker Label</label>
                      <input
                        type="text"
                        value={editDraft.kicker}
                        onChange={(e) => setEditDraft({ ...editDraft, kicker: e.target.value })}
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-1.5 text-xs text-[#F4F1EA]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#8E8E96] mb-1">Public Heading</label>
                      <input
                        type="text"
                        value={editDraft.heading}
                        onChange={(e) => setEditDraft({ ...editDraft, heading: e.target.value })}
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-1.5 text-xs text-[#F4F1EA]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#8E8E96] mb-1">Subheading</label>
                      <input
                        type="text"
                        value={editDraft.subheading}
                        onChange={(e) => setEditDraft({ ...editDraft, subheading: e.target.value })}
                        className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-1.5 text-xs text-[#F4F1EA]"
                      />
                    </div>
                  </div>

                  {sec.type === 'HERO' && (
                    <div className="pt-2">
                      <DriveImageUpload
                        label="Hero Section Background Image (With Dark Overlay)"
                        value={editDraft.backgroundImage}
                        fileId={editDraft.backgroundImageFileId}
                        aspectClass="aspect-video"
                        helperText="Uploads directly to the Google Drive 'Images' folder and displays behind the Hero section with a black gradient overlay."
                        onChange={({ url, fileId }) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            backgroundImage: url,
                            backgroundImageFileId: fileId,
                          }))
                        }
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => saveEditing(sec)}
                      className="px-4 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Section</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded border border-[#2E2E38] text-xs text-[#9A9AA2] inline-flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  RotateCcw,
  Sliders,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload.jsx';

const SECTION_TYPES = [
  { value: 'HERO', label: 'Editorial Hero Section', defaultUrl: '/music' },
  { value: 'FEATURED_MUSIC', label: 'Featured Music Repertoire', defaultUrl: '/music' },
  { value: 'LATEST_RELEASES', label: 'Latest Releases Grid', defaultUrl: '/music' },
  { value: 'POPULAR_MUSIC', label: 'Popular Tracks', defaultUrl: '/music' },
  { value: 'ALBUMS', label: 'Official Releases & Discography', defaultUrl: '/releases' },
  { value: 'BIOGRAPHY_PREVIEW', label: 'Artist Biography Monograph', defaultUrl: '/about' },
  { value: 'ARTIST_INTRO', label: 'Artist Introduction', defaultUrl: '/about' },
  { value: 'MUSIC_VIDEOS', label: 'Music Videos & Sessions', defaultUrl: '/videos' },
  { value: 'GALLERY', label: 'Visual Artwork Gallery', defaultUrl: '/gallery' },
  { value: 'SOCIAL_LINKS', label: 'Social Channels Bar', defaultUrl: '' },
  { value: 'CONTACT_SECTION', label: 'Management & Inquiry Section', defaultUrl: '/contact' },
];

export default function AdminSectionsClient({ initialSections = [] }) {
  const [sections, setSections] = useState(
    [...initialSections].sort((a, b) => a.position - b.position)
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('FEATURED_MUSIC');
  const [newHeading, setNewHeading] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Comprehensive draft state for full section & button customization
  const [editDraft, setEditDraft] = useState({
    name: '',
    kicker: '',
    heading: '',
    subheading: '',
    body: '',
    // Buttons
    primaryCtaText: '',
    primaryCtaUrl: '',
    secondaryCtaText: '',
    secondaryCtaUrl: '',
    showLatestPlayButton: true,
    latestPlayButtonText: '',
    ctaText: '',
    ctaUrl: '',
    showCtaButton: true,
    showEmailButton: true,
    // Display & Empty States
    limit: 8,
    emptyHeading: '',
    emptyText: '',
    // Images
    backgroundImage: '',
    backgroundImageFileId: '',
  });

  const [statusMsg, setStatusMsg] = useState('');

  function startEditing(sec) {
    setEditingId(sec.id);
    const content = sec.content || {};
    setEditDraft({
      name: sec.name || '',
      kicker: content.kicker || '',
      heading: content.heading || content.headline || '',
      subheading: content.subheading || content.subheadline || '',
      body: content.body || '',
      primaryCtaText: content.primaryCtaText !== undefined ? content.primaryCtaText : 'Listen to Archive',
      primaryCtaUrl: content.primaryCtaUrl || '/music',
      secondaryCtaText: content.secondaryCtaText !== undefined ? content.secondaryCtaText : 'Artist Monograph',
      secondaryCtaUrl: content.secondaryCtaUrl || '/about',
      showLatestPlayButton: content.showLatestPlayButton !== false,
      latestPlayButtonText: content.latestPlayButtonText || 'Play Latest Release',
      ctaText: content.ctaText !== undefined ? content.ctaText : (sec.type === 'ALBUMS' ? 'View All Releases' : 'Open Full Music Library'),
      ctaUrl: content.ctaUrl || (sec.type === 'ALBUMS' ? '/releases' : sec.type === 'BIOGRAPHY_PREVIEW' ? '/about' : sec.type === 'MUSIC_VIDEOS' ? '/videos' : sec.type === 'GALLERY' ? '/gallery' : '/music'),
      showCtaButton: content.showCtaButton !== false,
      showEmailButton: content.showEmailButton !== false,
      limit: Number(content.limit) > 0 ? Number(content.limit) : (sec.type === 'ALBUMS' ? 12 : 8),
      emptyHeading: content.emptyHeading || '',
      emptyText: content.emptyText || '',
      backgroundImage: content.backgroundImage || '',
      backgroundImageFileId: content.backgroundImageFileId || '',
    });
  }

  async function saveEditing(sec) {
    const nextContent = {
      ...sec.content,
      kicker: editDraft.kicker.trim(),
      heading: editDraft.heading.trim(),
      headline: editDraft.heading.trim(),
      subheading: editDraft.subheading.trim(),
      subheadline: editDraft.subheading.trim(),
      body: editDraft.body.trim(),
      primaryCtaText: editDraft.primaryCtaText.trim(),
      primaryCtaUrl: editDraft.primaryCtaUrl.trim(),
      secondaryCtaText: editDraft.secondaryCtaText.trim(),
      secondaryCtaUrl: editDraft.secondaryCtaUrl.trim(),
      showLatestPlayButton: editDraft.showLatestPlayButton,
      latestPlayButtonText: editDraft.latestPlayButtonText.trim(),
      ctaText: editDraft.ctaText.trim(),
      ctaUrl: editDraft.ctaUrl.trim(),
      showCtaButton: editDraft.showCtaButton,
      showEmailButton: editDraft.showEmailButton,
      limit: Number(editDraft.limit) || 8,
      emptyHeading: editDraft.emptyHeading.trim(),
      emptyText: editDraft.emptyText.trim(),
      backgroundImage: editDraft.backgroundImage || '',
      backgroundImageFileId: editDraft.backgroundImageFileId || '',
    };

    const res = await fetch('/api/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sec.id,
        name: editDraft.name.trim() || sec.name,
        content: nextContent,
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setSections((prev) => prev.map((s) => (s.id === sec.id ? data.section : s)));
      setEditingId(null);
      setStatusMsg(`Saved changes for section "${data.section.name}".`);
    }
  }

  async function handleAddSection(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const typeDef = SECTION_TYPES.find((t) => t.value === newType);
    const defaultUrl = typeDef?.defaultUrl || '/music';

    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        type: newType,
        isVisible: true,
        content: {
          heading: newHeading.trim() || newName.trim(),
          ctaText: 'Explore More',
          ctaUrl: defaultUrl,
          showCtaButton: true,
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.section) {
      setSections((prev) => [...prev, data.section]);
      setNewName('');
      setNewHeading('');
      setShowAddForm(false);
      setStatusMsg(`Added new section "${data.section.name}".`);
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
      setStatusMsg(`Visibility toggled for "${sec.name}".`);
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

  async function handleDelete(sec) {
    if (!confirm(`Are you sure you want to delete "${sec.name}"? You can restore default sections anytime.`)) {
      return;
    }
    const res = await fetch(`/api/sections?id=${encodeURIComponent(sec.id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== sec.id));
      setStatusMsg(`Deleted section "${sec.name}".`);
    }
  }

  async function handleRestoreDefaults() {
    if (
      !confirm(
        'Restore the standard 6 homepage sections (Hero, Featured Music, Releases, Biography, Videos, Contact)? This will reset section orders and button links to pristine defaults.'
      )
    ) {
      return;
    }
    setIsRestoring(true);
    try {
      const res = await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restoreDefaults' }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.sections) {
        setSections(data.sections);
        setEditingId(null);
        setStatusMsg('Restored official standard sections. Frontend and Admin are now 100% in sync!');
      }
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111115] border border-[#222228] rounded-lg p-5">
        <div>
          <h2 className="text-base font-bold text-[#F4F1EA] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#C8A464]" />
            <span>Homepage Architecture & Button Customizer</span>
          </h2>
          <p className="text-xs text-[#8E8E96] mt-1">
            Every button, heading, kicker, item limit, and section order on the homepage can be managed here.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            disabled={isRestoring}
            className="px-3.5 py-2 rounded border border-[#C8A464]/30 hover:border-[#C8A464] text-xs font-semibold text-[#C8A464] hover:bg-[#C8A464]/10 transition-colors inline-flex items-center gap-1.5"
            title="Reset to the 6 official standard sections"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>Restore Standard Sections</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded bg-[#C8A464] hover:bg-[#D4B475] text-[#09090B] text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Section</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0] flex items-center justify-between">
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

      {/* Add New Section Drawer / Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSection}
          className="bg-[#141419] border border-[#C8A464]/40 rounded-lg p-6 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-[#222228] pb-3">
            <h3 className="text-sm font-bold text-[#F4F1EA]">Add New Dynamic Homepage Section</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[#9A9AA2] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] text-[#8E8E96]">Internal Label</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Selected Discography"
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] text-[#8E8E96]">Section Type</label>
              <select
                aria-label="Section Type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] text-[#8E8E96]">Public Heading</label>
              <input
                type="text"
                value={newHeading}
                onChange={(e) => setNewHeading(e.target.value)}
                placeholder="e.g. Master Recordings"
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded border border-[#27272E] text-xs text-[#9A9AA2]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-bold hover:bg-[#D4B475]"
            >
              Confirm & Add Section
            </button>
          </div>
        </form>
      )}

      {/* Sections Reorderable List */}
      <div className="space-y-4">
        {sections.map((sec, idx) => {
          const isEditing = editingId === sec.id;
          const isHero = sec.type === 'HERO';
          const isBio = sec.type === 'BIOGRAPHY_PREVIEW' || sec.type === 'ARTIST_INTRO';
          const isMusicOrAlbums =
            sec.type === 'FEATURED_MUSIC' ||
            sec.type === 'LATEST_RELEASES' ||
            sec.type === 'POPULAR_MUSIC' ||
            sec.type === 'ALBUMS' ||
            sec.type === 'MUSIC_VIDEOS' ||
            sec.type === 'GALLERY';

          return (
            <div
              key={sec.id}
              className={`bg-[#111115] border rounded-lg transition-all ${
                isEditing ? 'border-[#C8A464] shadow-lg shadow-[#C8A464]/5' : 'border-[#222228]'
              }`}
            >
              {/* Header Bar */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#C8A464] tabular-nums bg-[#18181F] border border-[#27272E] w-7 h-7 rounded flex items-center justify-center font-bold">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#F4F1EA]">{sec.name}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-[#1A1A22] text-[#C8A464] border border-[#2A2A36]">
                        {sec.type}
                      </span>
                    </div>
                    <p className="text-xs text-[#8E8E96] mt-0.5">
                      Heading:{' '}
                      <span className="text-[#D4D4D8]">
                        {sec.content?.heading || sec.content?.headline || 'Default'}
                      </span>{' '}
                      · Button:{' '}
                      <span className="text-[#C8A464]">
                        {isHero
                          ? `${sec.content?.primaryCtaText || 'Listen'} (${sec.content?.primaryCtaUrl || '/music'})`
                          : `${sec.content?.ctaText || 'Explore'} (${sec.content?.ctaUrl || '/music'})`}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    aria-label={`Move ${sec.name} up`}
                    className="p-2 rounded border border-[#27272E] text-[#B4B4BC] hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === sections.length - 1}
                    aria-label={`Move ${sec.name} down`}
                    className="p-2 rounded border border-[#27272E] text-[#B4B4BC] hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(sec)}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      sec.isVisible
                        ? 'border-[#166534] bg-[#166534]/10 text-[#4ADE80]'
                        : 'border-[#52525B] bg-[#27272A]/20 text-[#A1A1AA]'
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
                    className={`px-3 py-1.5 rounded border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      isEditing
                        ? 'bg-[#C8A464] text-[#09090B] border-[#C8A464]'
                        : 'border-[#27272E] text-[#C8A464] hover:border-[#C8A464]'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Close' : 'Customize'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(sec)}
                    aria-label={`Delete ${sec.name}`}
                    className="p-2 rounded border border-[#27272E] text-[#9A9AA2] hover:text-[#F87171] hover:border-[#F87171]/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Comprehensive Customizer Drawer */}
              {isEditing && (
                <div className="p-5 sm:p-6 border-t border-[#1E1E24] bg-[#0E0E12] space-y-6">
                  {/* Category 1: Typography & Copy */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A464] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Section Copy & Typography</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] text-[#8E8E96] mb-1">Internal Name</label>
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                          className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] text-[#8E8E96] mb-1">
                          Kicker Tag (Gold Small Header)
                        </label>
                        <input
                          type="text"
                          value={editDraft.kicker}
                          onChange={(e) => setEditDraft({ ...editDraft, kicker: e.target.value })}
                          placeholder="e.g. OFFICIAL ARTIST ARCHIVE"
                          className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] text-[#8E8E96] mb-1">
                          Main Heading (H1 / H2)
                        </label>
                        <input
                          type="text"
                          value={editDraft.heading}
                          onChange={(e) => setEditDraft({ ...editDraft, heading: e.target.value })}
                          className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                        />
                      </div>
                      <div className="sm:col-span-12">
                        <label className="block text-[11px] text-[#8E8E96] mb-1">Subheading / Description</label>
                        <textarea
                          rows={2}
                          value={editDraft.subheading}
                          onChange={(e) => setEditDraft({ ...editDraft, subheading: e.target.value })}
                          className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA] resize-none"
                        />
                      </div>

                      {isBio && (
                        <div className="sm:col-span-12">
                          <label className="block text-[11px] text-[#8E8E96] mb-1">
                            Custom Biography Body Text
                          </label>
                          <textarea
                            rows={4}
                            value={editDraft.body}
                            onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
                            placeholder="Leave blank to automatically use the artist's official biography from Artist profile."
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category 2: Button & Call to Action Customization */}
                  <div className="space-y-3 pt-3 border-t border-[#1C1C24]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A464] flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buttons & Navigation Actions</span>
                    </h4>

                    {isHero ? (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        <div className="sm:col-span-6 space-y-2">
                          <label className="block text-[11px] text-[#8E8E96]">Primary Button Label</label>
                          <input
                            type="text"
                            value={editDraft.primaryCtaText}
                            onChange={(e) => setEditDraft({ ...editDraft, primaryCtaText: e.target.value })}
                            placeholder="e.g. Listen to Archive"
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>
                        <div className="sm:col-span-6 space-y-2">
                          <label className="block text-[11px] text-[#8E8E96]">Primary Button Target URL</label>
                          <input
                            type="text"
                            value={editDraft.primaryCtaUrl}
                            onChange={(e) => setEditDraft({ ...editDraft, primaryCtaUrl: e.target.value })}
                            placeholder="e.g. /music"
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>
                        <div className="sm:col-span-6 space-y-2">
                          <label className="block text-[11px] text-[#8E8E96]">Secondary Button Label</label>
                          <input
                            type="text"
                            value={editDraft.secondaryCtaText}
                            onChange={(e) => setEditDraft({ ...editDraft, secondaryCtaText: e.target.value })}
                            placeholder="e.g. Artist Monograph"
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>
                        <div className="sm:col-span-6 space-y-2">
                          <label className="block text-[11px] text-[#8E8E96]">Secondary Button Target URL</label>
                          <input
                            type="text"
                            value={editDraft.secondaryCtaUrl}
                            onChange={(e) => setEditDraft({ ...editDraft, secondaryCtaUrl: e.target.value })}
                            placeholder="e.g. /about"
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>

                        <div className="sm:col-span-12 flex items-center gap-3 p-3 bg-[#131318] border border-[#22222A] rounded">
                          <input
                            type="checkbox"
                            id={`playBtn-${sec.id}`}
                            checked={editDraft.showLatestPlayButton}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, showLatestPlayButton: e.target.checked })
                            }
                            className="accent-[#C8A464] w-4 h-4 rounded"
                          />
                          <label htmlFor={`playBtn-${sec.id}`} className="text-xs text-[#F4F1EA] cursor-pointer">
                            Show &quot;Play Latest Release&quot; direct stream button when audio exists
                          </label>
                          <input
                            type="text"
                            value={editDraft.latestPlayButtonText}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, latestPlayButtonText: e.target.value })
                            }
                            placeholder="Play Latest Release"
                            className="ml-auto bg-[#09090B] border border-[#27272E] rounded px-2.5 py-1 text-xs text-[#F4F1EA] w-48"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        <div className="sm:col-span-4 space-y-2">
                          <label className="block text-[11px] text-[#8E8E96]">Button Text (CTA)</label>
                          <input
                            type="text"
                            value={editDraft.ctaText}
                            onChange={(e) => setEditDraft({ ...editDraft, ctaText: e.target.value })}
                            placeholder="e.g. Open Full Library"
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>
                        <div className="sm:col-span-5 space-y-2">
                          <label className="block text-[11px] text-[#8E8E96]">Button Target URL</label>
                          <input
                            type="text"
                            value={editDraft.ctaUrl}
                            onChange={(e) => setEditDraft({ ...editDraft, ctaUrl: e.target.value })}
                            placeholder="e.g. /music or /releases"
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>
                        <div className="sm:col-span-3 flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer pb-2">
                            <input
                              type="checkbox"
                              checked={editDraft.showCtaButton}
                              onChange={(e) =>
                                setEditDraft({ ...editDraft, showCtaButton: e.target.checked })
                              }
                              className="accent-[#C8A464] w-4 h-4 rounded"
                            />
                            <span className="text-xs text-[#D4D4D8]">Show Action Button</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Category 3: Display Controls & Empty States */}
                  {isMusicOrAlbums && (
                    <div className="space-y-3 pt-3 border-t border-[#1C1C24]">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#C8A464] flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Display Limits & Empty States</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        <div className="sm:col-span-4 space-y-1">
                          <label className="block text-[11px] text-[#8E8E96]">
                            Max Items to Display
                          </label>
                          <select
                            value={editDraft.limit}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, limit: Number(e.target.value) })
                            }
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          >
                            <option value={4}>4 items</option>
                            <option value={6}>6 items</option>
                            <option value={8}>8 items</option>
                            <option value={12}>12 items</option>
                            <option value={16}>16 items</option>
                          </select>
                        </div>
                        <div className="sm:col-span-8 space-y-1">
                          <label className="block text-[11px] text-[#8E8E96]">
                            Custom Empty State Message (Shown when 0 items exist)
                          </label>
                          <input
                            type="text"
                            value={editDraft.emptyText}
                            onChange={(e) => setEditDraft({ ...editDraft, emptyText: e.target.value })}
                            placeholder="e.g. Published audio recordings will appear here automatically."
                            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category 4: Hero Background Image */}
                  {isHero && (
                    <div className="pt-3 border-t border-[#1C1C24]">
                      <DriveImageUpload
                        label="Hero Section Background Image (Full Width with Dark Gradient)"
                        value={editDraft.backgroundImage}
                        fileId={editDraft.backgroundImageFileId}
                        aspectClass="aspect-video"
                        helperText="Saves directly to your Google Drive 'Images' folder and displays behind the hero section."
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

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1E1E24]">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 rounded border border-[#2E2E38] text-xs text-[#9A9AA2] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEditing(sec)}
                      className="px-5 py-2 rounded bg-[#C8A464] hover:bg-[#D4B475] text-[#09090B] text-xs font-bold inline-flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Section Changes</span>
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

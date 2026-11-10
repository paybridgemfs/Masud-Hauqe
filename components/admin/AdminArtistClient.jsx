'use client';

import React, { useState } from 'react';
import { Save, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload.jsx';

export default function AdminArtistClient({ initialArtist, initialSocialLinks = [] }) {
  const [artist, setArtist] = useState({
    name: initialArtist?.name || 'Masud Hauqe',
    slug: initialArtist?.slug || 'masud-hauqe',
    shortBiography: initialArtist?.shortBiography || '',
    biography: initialArtist?.biography || '',
    careerInfo: initialArtist?.careerInfo || '',
    musicalBg: initialArtist?.musicalBg || '',
    profileImage: initialArtist?.profileImage || '',
    profileImageFileId: initialArtist?.profileImageFileId || '',
    coverImage: initialArtist?.coverImage || '',
    coverImageFileId: initialArtist?.coverImageFileId || '',
    location: initialArtist?.location || '',
    website: initialArtist?.website || '',
    achievements: Array.isArray(initialArtist?.achievements) ? initialArtist.achievements : [],
  });

  const [socialLinks, setSocialLinks] = useState(initialSocialLinks);
  const [newSocial, setNewSocial] = useState({ platform: '', url: '' });
  const [newAch, setNewAch] = useState({ title: '', year: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSaveArtist(e) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/artist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(artist),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ type: 'error', text: data.error || 'Failed to update artist profile.' });
      } else {
        setStatus({
          type: 'success',
          text: 'Artist profile, Drive image IDs, and biography saved in PostgreSQL.',
        });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error while saving artist profile.' });
    } finally {
      setSaving(false);
    }
  }

  function handleAddAchievement() {
    if (!newAch.title.trim()) return;
    setArtist((prev) => ({
      ...prev,
      achievements: [
        ...prev.achievements,
        {
          id: `ach-${Date.now()}`,
          title: newAch.title.trim(),
          year: newAch.year.trim(),
          description: newAch.description.trim(),
        },
      ],
    }));
    setNewAch({ title: '', year: '', description: '' });
  }

  function handleRemoveAchievement(idx) {
    setArtist((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== idx),
    }));
  }

  async function handleAddSocial(e) {
    e.preventDefault();
    if (!newSocial.platform.trim() || !newSocial.url.trim()) return;
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        group: 'socialLinks',
        action: 'create',
        item: {
          platform: newSocial.platform.trim(),
          url: newSocial.url.trim(),
          position: socialLinks.length + 1,
          isVisible: true,
        },
      }),
    });
    if (res.ok) {
      const refreshed = await fetch('/api/settings').then((r) => r.json());
      if (refreshed.socialLinks) setSocialLinks(refreshed.socialLinks);
      setNewSocial({ platform: '', url: '' });
      setStatus({ type: 'success', text: 'Social media link added.' });
    }
  }

  async function handleDeleteSocial(id) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        group: 'socialLinks',
        action: 'delete',
        item: { id },
      }),
    });
    if (res.ok) {
      setSocialLinks((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <div className="space-y-10">
      {status && (
        <div
          role="alert"
          className={`p-4 rounded border text-xs sm:text-sm flex items-center gap-2.5 ${
            status.type === 'success'
              ? 'bg-[#11261B] border-[#166534] text-[#BBF7D0]'
              : 'bg-[#2A1215] border-[#7F1D1D] text-[#FECACA]'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      <form onSubmit={handleSaveArtist} className="space-y-8">
        {/* Core Identity & Images */}
        <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-bold text-[#F4F1EA]">Artist Identity & Visual Portraits</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="artist-name" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                Artist Name *
              </label>
              <input
                id="artist-name"
                type="text"
                required
                value={artist.name}
                onChange={(e) => setArtist({ ...artist, name: e.target.value })}
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
              />
            </div>

            <div>
              <label htmlFor="artist-location" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                Location / Base
              </label>
              <input
                id="artist-location"
                type="text"
                value={artist.location}
                onChange={(e) => setArtist({ ...artist, location: e.target.value })}
                placeholder="e.g. Dhaka / International"
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DriveImageUpload
              label="Profile Portrait Image (Hero Right Card & About Page)"
              value={artist.profileImage}
              fileId={artist.profileImageFileId}
              aspectClass="aspect-square"
              helperText="Uploads to Google Drive 'Images' folder. Displayed on the right side of the Hero section and on the About page."
              onChange={({ url, fileId }) =>
                setArtist((prev) => ({
                  ...prev,
                  profileImage: url,
                  profileImageFileId: fileId,
                }))
              }
            />

            <DriveImageUpload
              label="Hero Background / Cover Image (With Dark Overlay)"
              value={artist.coverImage}
              fileId={artist.coverImageFileId}
              aspectClass="aspect-video"
              helperText="Uploads to Google Drive 'Images' folder. Displayed as the full-width Hero background with a dark overlay."
              onChange={({ url, fileId }) =>
                setArtist((prev) => ({
                  ...prev,
                  coverImage: url,
                  coverImageFileId: fileId,
                }))
              }
            />
          </div>

          <div>
            <label htmlFor="artist-short-bio" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
              Short Biography (Lead Summary)
            </label>
            <textarea
              id="artist-short-bio"
              rows={2}
              value={artist.shortBiography}
              onChange={(e) => setArtist({ ...artist, shortBiography: e.target.value })}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label htmlFor="artist-full-bio" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
              Full Artist Biography
            </label>
            <textarea
              id="artist-full-bio"
              rows={6}
              value={artist.biography}
              onChange={(e) => setArtist({ ...artist, biography: e.target.value })}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="artist-career" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                Career Information
              </label>
              <textarea
                id="artist-career"
                rows={4}
                value={artist.careerInfo}
                onChange={(e) => setArtist({ ...artist, careerInfo: e.target.value })}
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
              />
            </div>

            <div>
              <label htmlFor="artist-musical-bg" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
                Musical Background
              </label>
              <textarea
                id="artist-musical-bg"
                rows={4}
                value={artist.musicalBg}
                onChange={(e) => setArtist({ ...artist, musicalBg: e.target.value })}
                className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
              />
            </div>
          </div>
        </section>

        {/* Achievements Editor */}
        <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#F4F1EA]">Achievements & Career Milestones</h2>

          {artist.achievements.length > 0 && (
            <div className="space-y-2">
              {artist.achievements.map((ach, idx) => (
                <div
                  key={ach.id || idx}
                  className="bg-[#09090B] border border-[#27272E] rounded p-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#F4F1EA]">
                      {ach.title}{' '}
                      {ach.year && <span className="text-xs text-[#C8A464]">· {ach.year}</span>}
                    </p>
                    {ach.description && (
                      <p className="text-xs text-[#8E8E96] mt-0.5">{ach.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAchievement(idx)}
                    aria-label={`Remove achievement ${ach.title}`}
                    className="p-1.5 text-[#9A9AA2] hover:text-[#F87171]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <input
              type="text"
              value={newAch.title}
              onChange={(e) => setNewAch({ ...newAch, title: e.target.value })}
              placeholder="Achievement Title"
              className="sm:col-span-4 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
            />
            <input
              type="text"
              value={newAch.year}
              onChange={(e) => setNewAch({ ...newAch, year: e.target.value })}
              placeholder="Year (e.g. 2026)"
              className="sm:col-span-2 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
            />
            <input
              type="text"
              value={newAch.description}
              onChange={(e) => setNewAch({ ...newAch, description: e.target.value })}
              placeholder="Brief description"
              className="sm:col-span-4 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
            />
            <button
              type="button"
              onClick={handleAddAchievement}
              className="sm:col-span-2 px-3 py-2 rounded border border-[#2E2E38] hover:border-[#C8A464] text-xs font-semibold text-[#C8A464] flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Artist Profile...' : 'Save Artist Profile & Biography'}</span>
          </button>
        </div>
      </form>

      {/* Social Media Profiles */}
      <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-[#F4F1EA]">Official Social Media Links</h2>

        {socialLinks.length > 0 && (
          <div className="divide-y divide-[#1E1E24]">
            {socialLinks.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-semibold text-[#F4F1EA]">{s.platform}</span>
                  <span aria-hidden="true"> · </span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C8A464] hover:underline"
                  >
                    {s.url}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSocial(s.id)}
                  aria-label={`Delete ${s.platform}`}
                  className="p-1.5 text-[#9A9AA2] hover:text-[#F87171]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAddSocial} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <input
            type="text"
            value={newSocial.platform}
            onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
            placeholder="Platform (e.g. YouTube, Spotify, Instagram)"
            className="sm:col-span-4 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
          />
          <input
            type="url"
            value={newSocial.url}
            onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
            placeholder="https://..."
            className="sm:col-span-6 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
          />
          <button
            type="submit"
            className="sm:col-span-2 px-3 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold"
          >
            Add Link
          </button>
        </form>
      </section>
    </div>
  );
}

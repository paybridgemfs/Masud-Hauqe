'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Save, CheckCircle2, AlertCircle, RotateCcw, Layout, Type, Image as ImageIcon } from 'lucide-react';
import DriveImageUpload from '@/components/admin/DriveImageUpload';

const DEFAULT_APPEARANCE = {
  siteName: 'Masud Hauqe',
  siteTagline: 'Official Music & Artist Platform',
  logoUrl: '',
  logoFileId: '',
  faviconUrl: '',
  faviconFileId: '',
  primaryColor: '#C8A464',
  secondaryColor: '#9E9A90',
  accentColor: '#E2C285',
  backgroundColor: '#09090B',
  textColor: '#F4F1EA',
  borderColor: 'rgba(244, 241, 234, 0.08)',
  containerWidth: '1400px',
  sectionSpacing: '96px',
  borderRadius: '4px',
  footerCopyright: `© ${new Date().getFullYear()} Masud Hauqe. All Rights Reserved.`,
};

export default function AdminAppearanceClient({ initialSettings = {} }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    ...DEFAULT_APPEARANCE,
    ...initialSettings,
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetDefaults = () => {
    setFormData(DEFAULT_APPEARANCE);
    setNotice('Reset form fields to signature Noir & Gold defaults. Click Save Changes to apply.');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: 'websiteSettings',
          values: formData,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to save appearance settings.');
      } else {
        setNotice('Global branding, theme colors, and layout controls saved.');
        router.refresh();
      }
    } catch {
      setError('Network error while saving appearance settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {notice && (
        <div className="p-4 bg-[#2E9B68]/10 border border-[#2E9B68]/30 rounded text-sm text-[#2E9B68] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#D64545]/10 border border-[#D64545]/30 rounded text-sm text-[#D64545] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Brand Identity */}
      <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#F4F1EA]/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-4 h-4 text-[#C8A464]" />
            <h2 className="text-base font-bold text-[#F4F1EA]">Global Branding & Identity</h2>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#9E9A90]">Typography: Dosis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Website Name
            </label>
            <input
              type="text"
              value={formData.siteName || ''}
              onChange={(e) => handleChange('siteName', e.target.value)}
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
              placeholder="Masud Hauqe"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Site Tagline
            </label>
            <input
              type="text"
              value={formData.siteTagline || ''}
              onChange={(e) => handleChange('siteTagline', e.target.value)}
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
              placeholder="Official Music & Artist Platform"
            />
          </div>

          <div>
            <DriveImageUpload
              label="Brand Logo Image (Optional)"
              value={formData.logoUrl || ''}
              fileId={formData.logoFileId || ''}
              aspectClass="aspect-video w-40"
              helperText="Uploads to Google Drive 'Images' folder. Leave empty for typographic wordmark."
              onChange={({ url, fileId }) => {
                setFormData((prev) => ({ ...prev, logoUrl: url, logoFileId: fileId }));
              }}
            />
          </div>

          <div>
            <DriveImageUpload
              label="Favicon Image (Optional)"
              value={formData.faviconUrl || ''}
              fileId={formData.faviconFileId || ''}
              aspectClass="aspect-square w-20"
              helperText="Uploads to Google Drive 'Images' folder and stores Drive file ID."
              onChange={({ url, fileId }) => {
                setFormData((prev) => ({ ...prev, faviconUrl: url, faviconFileId: fileId }));
              }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Footer Copyright Text
            </label>
            <input
              type="text"
              value={formData.footerCopyright || ''}
              onChange={(e) => handleChange('footerCopyright', e.target.value)}
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
              placeholder="© 2026 Masud Hauqe. All Rights Reserved."
            />
          </div>
        </div>
      </div>

      {/* Theme Colors */}
      <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#F4F1EA]/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-[#C8A464]" />
            <h2 className="text-base font-bold text-[#F4F1EA]">Atmospheric Palette & Color Tokens</h2>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-[#9E9A90] hover:text-[#F4F1EA] inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Noir & Gold Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { key: 'primaryColor', label: 'Primary Accent (Champagne Gold)' },
            { key: 'secondaryColor', label: 'Secondary Surface (Studio Charcoal)' },
            { key: 'accentColor', label: 'Hover / Highlight Accent' },
            { key: 'backgroundColor', label: 'Canvas Background (Obsidian)' },
            { key: 'textColor', label: 'Primary Text (Alabaster)' },
          ].map((item) => (
            <div key={item.key} className="p-4 bg-[#09090B] border border-[#F4F1EA]/[0.08] rounded">
              <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2.5">
                {item.label}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(formData[item.key] || '')
                      ? formData[item.key]
                      : '#C8A464'
                  }
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="w-10 h-10 bg-transparent border border-[#F4F1EA]/[0.15] rounded cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={formData[item.key] || ''}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="w-full h-10 px-3 bg-[#111115] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] font-mono tabular-nums focus:outline-none focus:border-[#C8A464]"
                />
              </div>
            </div>
          ))}

          <div className="p-4 bg-[#09090B] border border-[#F4F1EA]/[0.08] rounded">
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2.5">
              Hairline Border Color (CSS / RGBA)
            </label>
            <input
              type="text"
              value={formData.borderColor || ''}
              onChange={(e) => handleChange('borderColor', e.target.value)}
              className="w-full h-10 px-3 bg-[#111115] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] font-mono focus:outline-none focus:border-[#C8A464]"
            />
          </div>
        </div>
      </div>

      {/* Layout & Spatial Architecture */}
      <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-6">
        <div className="flex items-center gap-2.5 border-b border-[#F4F1EA]/[0.08] pb-4">
          <Layout className="w-4 h-4 text-[#C8A464]" />
          <h2 className="text-base font-bold text-[#F4F1EA]">Spatial Rhythm & Container Geometry</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Max Container Width
            </label>
            <select
              value={formData.containerWidth || '1400px'}
              onChange={(e) => handleChange('containerWidth', e.target.value)}
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
            >
              <option value="1280px">1280px (Compact Editorial)</option>
              <option value="1400px">1400px (Signature Widescreen)</option>
              <option value="1536px">1536px (Full Studio Exhibition)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Vertical Section Spacing
            </label>
            <select
              value={formData.sectionSpacing || '96px'}
              onChange={(e) => handleChange('sectionSpacing', e.target.value)}
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
            >
              <option value="64px">64px (Dense)</option>
              <option value="96px">96px (Balanced Editorial)</option>
              <option value="128px">128px (Monumental Gallery)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Surface Border Radius
            </label>
            <select
              value={formData.borderRadius || '4px'}
              onChange={(e) => handleChange('borderRadius', e.target.value)}
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
            >
              <option value="0px">0px (Sharp Architectural)</option>
              <option value="4px">4px (Refined Precision)</option>
              <option value="8px">8px (Soft Studio)</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-[#09090B] border border-[#F4F1EA]/[0.06] rounded flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Type className="w-4 h-4 text-[#C8A464]" />
            <div>
              <p className="text-sm font-semibold text-[#F4F1EA]">Global Typography Lock: Dosis</p>
              <p className="text-xs text-[#9E9A90]">
                Loaded via next/font/google across all public pages, audio player chrome, and Admin CMS.
              </p>
            </div>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#2E9B68] font-semibold">Active</span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[#C8A464] hover:bg-[#E2C285] disabled:opacity-50 text-[#09090B] font-bold text-xs uppercase tracking-widest rounded transition-colors inline-flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Appearance...' : 'Save Appearance Settings'}
        </button>
      </div>
    </form>
  );
}

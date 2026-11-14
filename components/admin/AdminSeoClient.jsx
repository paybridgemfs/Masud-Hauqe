'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Save, CheckCircle2, AlertCircle, Search, Loader2 } from 'lucide-react';

const SEO_PAGES = [
  { id: 'global', label: 'Global Site Defaults', path: '/*' },
  { id: 'home', label: 'Home Page', path: '/' },
  { id: 'music', label: 'Music Catalog', path: '/music' },
  { id: 'releases', label: 'Releases & Discography', path: '/releases' },
  { id: 'videos', label: 'Music Videos', path: '/videos' },
  { id: 'about', label: 'Artist Biography', path: '/about' },
  { id: 'gallery', label: 'Visual Gallery', path: '/gallery' },
  { id: 'contact', label: 'Contact & Booking', path: '/contact' },
];

function buildDefaultCanonical(baseAppUrl, pageId) {
  const cleanBase = (baseAppUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const found = SEO_PAGES.find((p) => p.id === pageId);
  if (!found || found.path === '/*' || found.path === '/') return cleanBase;
  return `${cleanBase}${found.path}`;
}

export default function AdminSeoClient({ initialSeoSettings = [], appUrl = '' }) {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState('global');
  const [seoList, setSeoList] = useState(initialSeoSettings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const defaultCanonicalForSelected = buildDefaultCanonical(appUrl, selectedPage);
  const rawRecord = seoList.find((s) => s.page === selectedPage);
  const currentRecord = {
    page: selectedPage,
    metaTitle:
      rawRecord?.metaTitle ||
      (selectedPage === 'global'
        ? 'Masud Hauqe — Official Music & Artist Platform'
        : `Masud Hauqe — ${SEO_PAGES.find((p) => p.id === selectedPage)?.label || 'Official'}`),
    metaDescription:
      rawRecord?.metaDescription ||
      'Official website, discography, streaming catalog, and visual archive of recording artist Masud Hauqe.',
    canonicalUrl: rawRecord?.canonicalUrl || defaultCanonicalForSelected,
    ogImage: rawRecord?.ogImage || '',
    ogImageFileId: rawRecord?.ogImageFileId || '',
  };

  const handleFieldChange = (field, value) => {
    setSeoList((prev) => {
      const exists = prev.some((s) => s.page === selectedPage);
      if (exists) {
        return prev.map((s) =>
          s.page === selectedPage
            ? {
                ...s,
                canonicalUrl: s.canonicalUrl || defaultCanonicalForSelected,
                [field]: value,
              }
            : s
        );
      }
      return [
        ...prev,
        {
          page: selectedPage,
          metaTitle: currentRecord.metaTitle,
          metaDescription: currentRecord.metaDescription,
          canonicalUrl: currentRecord.canonicalUrl || defaultCanonicalForSelected,
          ogImage: currentRecord.ogImage,
          ogImageFileId: currentRecord.ogImageFileId || '',
          [field]: value,
        },
      ];
    });
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
          group: 'seoSettings',
          item: {
            page: selectedPage,
            metaTitle: currentRecord.metaTitle || '',
            metaDescription: currentRecord.metaDescription || '',
            canonicalUrl: currentRecord.canonicalUrl || '',
            ogImage: currentRecord.ogImage || '',
            ogImageFileId: currentRecord.ogImageFileId || '',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to save SEO configuration.');
      } else {
        setNotice(`SEO metadata saved for "${SEO_PAGES.find((p) => p.id === selectedPage)?.label}".`);
        router.refresh();
      }
    } catch {
      setError('Network error while saving SEO metadata.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Route Selector */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-5">
          <h2 className="text-xs uppercase tracking-widest text-[#9E9A90] font-bold mb-4">
            Select Route Target
          </h2>
          <div className="space-y-1">
            {SEO_PAGES.map((p) => {
              const isSelected = selectedPage === p.id;
              const isConfigured = seoList.some((s) => s.page === p.id && s.metaTitle);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPage(p.id);
                    setNotice(null);
                    setError(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded text-sm flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#C8A464]/15 text-[#F4F1EA] border-l-2 border-[#C8A464] font-semibold'
                      : 'text-[#9E9A90] hover:text-[#F4F1EA] hover:bg-[#18181F]'
                  }`}
                >
                  <div>
                    <div className="leading-tight">{p.label}</div>
                    <div className="text-[11px] text-[#68645E] font-mono mt-0.5">{p.path}</div>
                  </div>
                  <span
                    className={`text-[11px] uppercase tracking-wider ${
                      isConfigured ? 'text-[#2E9B68]' : 'text-[#68645E]'
                    }`}
                  >
                    {isConfigured ? 'Custom' : 'Default'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C8A464]">
            <Globe className="w-4 h-4" />
            <span>Automated Indexing</span>
          </div>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            Dynamic <code className="text-[#F4F1EA]">/sitemap.xml</code>,{' '}
            <code className="text-[#F4F1EA]">/robots.txt</code>, and Schema.org{' '}
            <code className="text-[#F4F1EA]">MusicGroup</code> /{' '}
            <code className="text-[#F4F1EA]">MusicRecording</code> JSON-LD structured data are
            automatically generated from your catalog.
          </p>
        </div>
      </div>

      {/* Right Column: Metadata Editor + SERP Preview */}
      <div className="lg:col-span-8 space-y-6">
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

        <form
          onSubmit={handleSave}
          className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-[#F4F1EA]/[0.08] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#F4F1EA]">
                {SEO_PAGES.find((p) => p.id === selectedPage)?.label} Metadata
              </h2>
              <p className="text-xs text-[#9E9A90]">
                Configure title tags, meta descriptions, OpenGraph imagery, and canonical URLs.
              </p>
            </div>
            <span className="text-xs font-mono text-[#C8A464]">
              {SEO_PAGES.find((p) => p.id === selectedPage)?.path}
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider text-[#9E9A90] font-semibold">
                  Meta Title
                </label>
                <span className="text-xs text-[#68645E] tabular-nums">
                  {(currentRecord.metaTitle || '').length} / 70 chars
                </span>
              </div>
              <input
                type="text"
                value={currentRecord.metaTitle || ''}
                onChange={(e) => handleFieldChange('metaTitle', e.target.value)}
                className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                placeholder="Masud Hauqe — Official Music & Artist Platform"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs uppercase tracking-wider text-[#9E9A90] font-semibold">
                  Meta Description
                </label>
                <span className="text-xs text-[#68645E] tabular-nums">
                  {(currentRecord.metaDescription || '').length} / 160 chars
                </span>
              </div>
              <textarea
                rows={3}
                value={currentRecord.metaDescription || ''}
                onChange={(e) => handleFieldChange('metaDescription', e.target.value)}
                className="w-full p-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                placeholder="Official website, discography, streaming catalog, and visual archive of recording artist Masud Hauqe."
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
                Canonical URL (Auto APP_URL)
              </label>
              <input
                type="text"
                value={currentRecord.canonicalUrl || ''}
                onChange={(e) => handleFieldChange('canonicalUrl', e.target.value)}
                className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                placeholder={defaultCanonicalForSelected}
              />
              <p className="text-[11px] text-[#9E9A90] mt-2">
                Note: Social preview banner images (<code className="text-[#C8A464]">og:image</code> /{' '}
                <code className="text-[#C8A464]">summary_large_image</code>) are dynamically attached
                exclusively to Track (<code className="text-[#F4F1EA]">/music/[slug]</code>) and
                Release (<code className="text-[#F4F1EA]">/releases/[slug]</code>) links. General
                website pages render clean text-only social cards.
              </p>
            </div>
          </div>

          {/* Search Engine Snippet Preview */}
          <div className="p-5 bg-[#09090B] border border-[#F4F1EA]/[0.08] rounded space-y-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#9E9A90] mb-2">
              <Search className="w-3.5 h-3.5 text-[#C8A464]" />
              <span>Search Engine Result Preview</span>
            </div>
            <div className="text-xs text-[#9E9A90] truncate">
              {currentRecord.canonicalUrl || defaultCanonicalForSelected}
            </div>
            <div className="text-base font-bold text-[#C8A464] truncate">
              {currentRecord.metaTitle || 'Masud Hauqe — Official Music & Artist Platform'}
            </div>
            <p className="text-xs text-[#9E9A90] line-clamp-2 leading-relaxed">
              {currentRecord.metaDescription ||
                'Explore official music releases, full-length albums, music videos, and press inquiries for Masud Hauqe.'}
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#C8A464] hover:bg-[#E2C285] disabled:opacity-50 text-[#09090B] font-bold text-xs uppercase tracking-widest rounded transition-colors inline-flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving SEO...' : 'Save Route SEO'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

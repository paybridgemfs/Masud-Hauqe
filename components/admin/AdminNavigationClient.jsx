'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AdminNavigationClient({ initialSettings = {}, initialNavItems = [] }) {
  const [navItems, setNavItems] = useState(initialNavItems);
  const [headerFooter, setHeaderFooter] = useState({
    logoText: initialSettings.logoText || 'MASUD HAUQE',
    stickyHeader: initialSettings.stickyHeader !== 'false',
    headerCtaLabel: initialSettings.headerCtaLabel || 'Explore Music',
    headerCtaUrl: initialSettings.headerCtaUrl || '/music',
    footerDescription: initialSettings.footerDescription || '',
    copyrightText: initialSettings.copyrightText || '',
    contactEmail: initialSettings.contactEmail || '',
    contactLocation: initialSettings.contactLocation || '',
  });
  const [newNav, setNewNav] = useState({ label: '', url: '', location: 'header' });
  const [savingHeaderFooter, setSavingHeaderFooter] = useState(false);
  const [addingNav, setAddingNav] = useState(false);
  const [togglingNavId, setTogglingNavId] = useState(null);
  const [deletingNavId, setDeletingNavId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  async function handleSaveHeaderFooter(e) {
    e.preventDefault();
    if (savingHeaderFooter) return;
    setSavingHeaderFooter(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: 'websiteSettings',
          values: {
            ...headerFooter,
            stickyHeader: String(headerFooter.stickyHeader),
          },
        }),
      });
      if (res.ok) {
        setStatusMsg('Header and Footer configuration saved.');
      }
    } finally {
      setSavingHeaderFooter(false);
    }
  }

  async function handleAddNav(e) {
    e.preventDefault();
    if (!newNav.label.trim() || !newNav.url.trim() || addingNav) return;
    setAddingNav(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: 'navigationItems',
          action: 'create',
          item: {
            label: newNav.label.trim(),
            url: newNav.url.trim(),
            location: newNav.location,
            position: navItems.length + 1,
            isVisible: true,
          },
        }),
      });
      if (res.ok) {
        const refreshed = await fetch('/api/settings').then((r) => r.json());
        if (refreshed.navigationItems) setNavItems(refreshed.navigationItems);
        setNewNav({ label: '', url: '', location: 'header' });
        setStatusMsg('Navigation item added.');
      }
    } finally {
      setAddingNav(false);
    }
  }

  async function toggleNavVisibility(item) {
    if (togglingNavId === item.id) return;
    setTogglingNavId(item.id);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: 'navigationItems',
          action: 'update',
          item: { id: item.id, isVisible: !item.isVisible },
        }),
      });
      if (res.ok) {
        setNavItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isVisible: !n.isVisible } : n))
        );
      }
    } finally {
      setTogglingNavId(null);
    }
  }

  async function deleteNavItem(id) {
    if (deletingNavId === id) return;
    setDeletingNavId(id);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: 'navigationItems',
          action: 'delete',
          item: { id },
        }),
      });
      if (res.ok) {
        setNavItems((prev) => prev.filter((n) => n.id !== id));
      }
    } finally {
      setDeletingNavId(null);
    }
  }

  return (
    <div className="space-y-8">
      {statusMsg && (
        <div className="p-3.5 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0]">
          {statusMsg}
        </div>
      )}

      {/* Header & Footer Configuration */}
      <form
        onSubmit={handleSaveHeaderFooter}
        className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-5"
      >
        <h2 className="text-lg font-bold text-[#F4F1EA]">Header & Footer Manager</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Header Wordmark Text
            </label>
            <input
              type="text"
              value={headerFooter.logoText}
              onChange={(e) => setHeaderFooter({ ...headerFooter, logoText: e.target.value })}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Header Primary CTA Label
            </label>
            <input
              type="text"
              value={headerFooter.headerCtaLabel}
              onChange={(e) => setHeaderFooter({ ...headerFooter, headerCtaLabel: e.target.value })}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Header Primary CTA URL
            </label>
            <input
              type="text"
              value={headerFooter.headerCtaUrl}
              onChange={(e) => setHeaderFooter({ ...headerFooter, headerCtaUrl: e.target.value })}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Footer Description
            </label>
            <textarea
              rows={2}
              value={headerFooter.footerDescription}
              onChange={(e) =>
                setHeaderFooter({ ...headerFooter, footerDescription: e.target.value })
              }
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Copyright Notice Text
            </label>
            <textarea
              rows={2}
              value={headerFooter.copyrightText}
              onChange={(e) => setHeaderFooter({ ...headerFooter, copyrightText: e.target.value })}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Management Contact Email
            </label>
            <input
              type="email"
              value={headerFooter.contactEmail}
              onChange={(e) => setHeaderFooter({ ...headerFooter, contactEmail: e.target.value })}
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
              Representation Desk Location
            </label>
            <input
              type="text"
              value={headerFooter.contactLocation}
              onChange={(e) =>
                setHeaderFooter({ ...headerFooter, contactLocation: e.target.value })
              }
              className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="inline-flex items-center gap-2 text-xs text-[#D4D4D8] cursor-pointer">
            <input
              type="checkbox"
              checked={headerFooter.stickyHeader}
              onChange={(e) =>
                setHeaderFooter({ ...headerFooter, stickyHeader: e.target.checked })
              }
              className="accent-[#C8A464]"
            />
            <span>Enable Sticky Header</span>
          </label>

          <button
            type="submit"
            disabled={savingHeaderFooter}
            className="px-5 py-2 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {savingHeaderFooter ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{savingHeaderFooter ? 'Saving...' : 'Save Header & Footer'}</span>
          </button>
        </div>
      </form>

      {/* Navigation Links Manager */}
      <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-[#F4F1EA]">Navigation Menu Links</h2>

        <form onSubmit={handleAddNav} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <input
            type="text"
            required
            value={newNav.label}
            onChange={(e) => setNewNav({ ...newNav, label: e.target.value })}
            placeholder="Menu Label (e.g. Videos)"
            className="sm:col-span-4 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
          />
          <input
            type="text"
            required
            value={newNav.url}
            onChange={(e) => setNewNav({ ...newNav, url: e.target.value })}
            placeholder="URL Path (e.g. /videos)"
            className="sm:col-span-4 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
          />
          <select
            aria-label="Menu Location"
            value={newNav.location}
            onChange={(e) => setNewNav({ ...newNav, location: e.target.value })}
            className="sm:col-span-2 bg-[#09090B] border border-[#27272E] rounded px-3 py-2 text-xs text-[#F4F1EA]"
          >
            <option value="header">Header</option>
            <option value="footer">Footer</option>
          </select>
          <button
            type="submit"
            disabled={addingNav}
            className="sm:col-span-2 px-3 py-2 rounded bg-[#C8A464] text-[#09090B] text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {addingNav ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>{addingNav ? 'Adding...' : 'Add Item'}</span>
          </button>
        </form>

        <div className="divide-y divide-[#1E1E24] pt-2">
          {navItems.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div>
                <span className="font-semibold text-[#F4F1EA]">{item.label}</span>
                <span aria-hidden="true"> · </span>
                <span className="text-[#8E8E96] font-mono">{item.url}</span>
                <span aria-hidden="true"> · </span>
                <span className="text-[#C8A464] uppercase">{item.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={togglingNavId === item.id}
                  onClick={() => toggleNavVisibility(item)}
                  className={`${item.isVisible ? 'text-[#4ADE80]' : 'text-[#71717A]'} disabled:opacity-50`}
                >
                  {togglingNavId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : item.isVisible ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={deletingNavId === item.id}
                  onClick={() => deleteNavItem(item.id)}
                  aria-label={`Delete navigation item ${item.label}`}
                  className="text-[#9A9AA2] hover:text-[#F87171] disabled:opacity-50"
                >
                  {deletingNavId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#F87171]" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

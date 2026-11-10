'use client';

import React, { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';

export function AdminPagesManager({ initialPages = [] }) {
  const [pages, setPages] = useState(initialPages);
  const [selectedId, setSelectedId] = useState(initialPages[0]?.id || '');
  const [statusMsg, setStatusMsg] = useState('');
  const [newPage, setNewPage] = useState({ title: '', slug: '', content: '' });

  const currentPage = pages.find((p) => p.id === selectedId) || null;

  async function handleSavePage(e) {
    e.preventDefault();
    if (!currentPage) return;
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group: 'pages',
        action: 'update',
        page: currentPage,
      }),
    });
    if (res.ok) {
      setStatusMsg(`Saved legal/CMS page "${currentPage.title}".`);
    }
  }

  async function handleCreatePage(e) {
    e.preventDefault();
    if (!newPage.title.trim() || !newPage.content.trim()) return;
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group: 'pages',
        action: 'create',
        page: newPage,
      }),
    });
    if (res.ok) {
      const refreshed = await fetch('/api/settings').then((r) => r.json());
      if (refreshed.pages) {
        setPages(refreshed.pages);
        setSelectedId(refreshed.pages[refreshed.pages.length - 1]?.id || '');
      }
      setNewPage({ title: '', slug: '', content: '' });
      setStatusMsg('Created new CMS page.');
    }
  }

  async function handleDeletePage(id) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        group: 'pages',
        action: 'delete',
        page: { id },
      }),
    });
    if (res.ok) {
      const next = pages.filter((p) => p.id !== id);
      setPages(next);
      setSelectedId(next[0]?.id || '');
    }
  }

  return (
    <div className="space-y-8">
      {statusMsg && (
        <div className="p-3.5 rounded bg-[#11261B] border border-[#166534] text-xs text-[#BBF7D0]">
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-[#111115] border border-[#222228] rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-[#8E8E96] px-2">PUBLISHED LEGAL & CMS PAGES</p>
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-3 py-2.5 rounded text-xs font-semibold flex items-center justify-between ${
                p.id === selectedId
                  ? 'bg-[#1D1B16] text-[#C8A464] border border-[#C8A464]/30'
                  : 'text-[#D4D4D8] hover:bg-[#16161C]'
              }`}
            >
              <span>{p.title}</span>
              <span className="font-mono text-[11px] text-[#8E8E96]">/{p.slug}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8">
          {currentPage ? (
            <form
              onSubmit={handleSavePage}
              className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#F4F1EA]">Edit Page: {currentPage.title}</h2>
                <button
                  type="button"
                  onClick={() => handleDeletePage(currentPage.id)}
                  className="text-xs text-[#FCA5A5] hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={currentPage.title}
                    onChange={(e) =>
                      setPages((prev) =>
                        prev.map((p) =>
                          p.id === currentPage.id ? { ...p, title: e.target.value } : p
                        )
                      )
                    }
                    className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                    URL Slug (/legal/...)
                  </label>
                  <input
                    type="text"
                    value={currentPage.slug}
                    onChange={(e) =>
                      setPages((prev) =>
                        prev.map((p) =>
                          p.id === currentPage.id ? { ...p, slug: e.target.value } : p
                        )
                      )
                    }
                    className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-sm text-[#F4F1EA] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D4D4D8] mb-1">
                  Page Content
                </label>
                <textarea
                  rows={8}
                  value={currentPage.content}
                  onChange={(e) =>
                    setPages((prev) =>
                      prev.map((p) =>
                        p.id === currentPage.id ? { ...p, content: e.target.value } : p
                      )
                    )
                  }
                  className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2.5 text-sm text-[#F4F1EA]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Page Changes</span>
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>

      {/* Create New Legal / CMS Page */}
      <form
        onSubmit={handleCreatePage}
        className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4"
      >
        <h2 className="text-base font-bold text-[#F4F1EA]">Create Additional Legal / CMS Page</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={newPage.title}
            onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
            placeholder="Page Title"
            className="bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA]"
          />
          <input
            type="text"
            value={newPage.slug}
            onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
            placeholder="Slug (optional)"
            className="bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA] font-mono"
          />
        </div>
        <textarea
          rows={3}
          value={newPage.content}
          onChange={(e) => setNewPage({ ...newPage, content: e.target.value })}
          placeholder="Page body text..."
          className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2 text-xs text-[#F4F1EA]"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded border border-[#2E2E38] hover:border-[#C8A464] text-xs font-semibold text-[#C8A464] inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Page</span>
        </button>
      </form>
    </div>
  );
}

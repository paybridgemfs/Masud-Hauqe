'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MailOpen, Trash2, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';

export default function AdminMessagesClient({ initialMessages = [] }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState(initialMessages[0]?.id || null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredMessages = messages.filter((m) => (filter === 'unread' ? !m.isRead : true));
  const activeMessage =
    messages.find((m) => m.id === selectedId) || filteredMessages[0] || null;

  const handleToggleRead = async (msg) => {
    if (togglingId === msg.id) return;
    setError(null);
    setTogglingId(msg.id);
    const nextRead = !msg.isRead;
    try {
      const res = await fetch('/api/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, isRead: nextRead }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isRead: nextRead } : m))
        );
        router.refresh();
      } else {
        setError('Failed to update message status.');
      }
    } catch {
      setError('Network error while updating message status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (deletingId === id) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/contact?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const remaining = messages.filter((m) => m.id !== id);
        setMessages(remaining);
        if (selectedId === id) {
          setSelectedId(remaining[0]?.id || null);
        }
        router.refresh();
      } else {
        setError('Failed to delete message.');
      }
    } catch {
      setError('Network error while deleting message.');
    } finally {
      setDeletingId(null);
    }
  };

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-[#D64545]/10 border border-[#D64545]/30 rounded text-sm text-[#D64545] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-xs uppercase tracking-widest font-bold pb-1 border-b-2 transition-colors ${
              filter === 'all'
                ? 'text-[#F4F1EA] border-[#C8A464]'
                : 'text-[#9E9A90] border-transparent hover:text-[#F4F1EA]'
            }`}
          >
            All Inquiries ({messages.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`text-xs uppercase tracking-widest font-bold pb-1 border-b-2 transition-colors ${
              filter === 'unread'
                ? 'text-[#C8A464] border-[#C8A464]'
                : 'text-[#9E9A90] border-transparent hover:text-[#F4F1EA]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="text-xs text-[#9E9A90]">
          Direct management & booking submissions from <code className="text-[#F4F1EA]">/contact</code>
        </div>
      </div>

      {filteredMessages.length === 0 ? (
        <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-12 text-center">
          <Mail className="w-8 h-8 text-[#68645E] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#F4F1EA] mb-1">No Contact Messages</h3>
          <p className="text-xs text-[#9E9A90] max-w-md mx-auto">
            {filter === 'unread'
              ? 'All visitor and booking inquiries have been reviewed.'
              : 'Messages submitted through the public Contact & Booking page will appear here in real time.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Message List */}
          <div className="lg:col-span-5 bg-[#111115] border border-[#F4F1EA]/[0.08] rounded divide-y divide-[#F4F1EA]/[0.06] max-h-[640px] overflow-y-auto">
            {filteredMessages.map((msg) => {
              const isSelected = activeMessage?.id === msg.id;
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => setSelectedId(msg.id)}
                  className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-3 ${
                    isSelected ? 'bg-[#18181F]' : 'hover:bg-[#18181F]/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!msg.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#C8A464] shrink-0" />
                      )}
                      <span
                        className={`text-sm truncate ${
                          !msg.isRead ? 'font-bold text-[#F4F1EA]' : 'font-medium text-[#9E9A90]'
                        }`}
                      >
                        {msg.name}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#F4F1EA] truncate mb-1">
                      {msg.subject || 'General Inquiry'}
                    </div>
                    <div className="text-xs text-[#68645E] truncate">{msg.email}</div>
                  </div>
                  <div className="text-[11px] text-[#68645E] tabular-nums shrink-0">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Message Inspector */}
          <div className="lg:col-span-7">
            {activeMessage ? (
              <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F4F1EA]/[0.08] pb-5">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-[#C8A464] font-semibold mb-1">
                      {activeMessage.isRead ? 'Reviewed Inquiry' : 'New Unread Inquiry'}
                    </div>
                    <h2 className="text-xl font-bold text-[#F4F1EA]">
                      {activeMessage.subject || 'General Inquiry'}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#9E9A90]">
                      <span>
                        From: <strong className="text-[#F4F1EA]">{activeMessage.name}</strong> (
                        <a
                          href={`mailto:${activeMessage.email}`}
                          className="text-[#C8A464] hover:underline"
                        >
                          {activeMessage.email}
                        </a>
                        )
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums text-[#68645E]">
                        <Clock className="w-3.5 h-3.5" />
                        {activeMessage.createdAt
                          ? new Date(activeMessage.createdAt).toLocaleString()
                          : 'Just now'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={togglingId === activeMessage.id}
                      onClick={() => handleToggleRead(activeMessage)}
                      className="px-3.5 py-2 bg-[#18181F] hover:bg-[#F4F1EA]/[0.08] text-xs font-semibold text-[#F4F1EA] rounded border border-[#F4F1EA]/[0.12] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {togglingId === activeMessage.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C8A464]" />
                          <span>Updating...</span>
                        </>
                      ) : activeMessage.isRead ? (
                        <>
                          <Mail className="w-3.5 h-3.5 text-[#9E9A90]" />
                          <span>Mark Unread</span>
                        </>
                      ) : (
                        <>
                          <MailOpen className="w-3.5 h-3.5 text-[#2E9B68]" />
                          <span>Mark Read</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === activeMessage.id}
                      onClick={() => handleDelete(activeMessage.id)}
                      className="px-3.5 py-2 bg-[#D64545]/10 hover:bg-[#D64545]/20 text-xs font-semibold text-[#D64545] rounded border border-[#D64545]/30 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {deletingId === activeMessage.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>{deletingId === activeMessage.id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-[#09090B] border border-[#F4F1EA]/[0.06] rounded text-sm text-[#F4F1EA] whitespace-pre-wrap leading-relaxed min-h-[200px]">
                  {activeMessage.message}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-[#68645E] font-mono">ID: {activeMessage.id}</span>
                  <a
                    href={`mailto:${activeMessage.email}?subject=Re: ${encodeURIComponent(
                      activeMessage.subject || 'Inquiry to Masud Hauqe Management'
                    )}`}
                    className="px-5 py-2.5 bg-[#C8A464] hover:bg-[#E2C285] text-[#09090B] font-bold text-xs uppercase tracking-widest rounded transition-colors"
                  >
                    Reply via Email
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

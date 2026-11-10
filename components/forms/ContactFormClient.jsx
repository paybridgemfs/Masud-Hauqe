'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ContactFormClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text: string }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus({
          type: 'error',
          text: data.error || 'Unable to submit your message. Please verify your inputs.',
        });
      } else {
        setStatus({
          type: 'success',
          text: data.message || 'Thank you. Your inquiry has been recorded.',
        });
        setFormData({ name: '', email: '', subject: '', message: '' });
      }
    } catch {
      setStatus({
        type: 'error',
        text: 'Network error while submitting contact form. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#111115] border border-[#222228] rounded-lg p-6 sm:p-8 space-y-5"
    >
      <h2 className="text-xl font-bold text-[#F4F1EA]">Send a Direct Message</h2>

      {status && (
        <div
          role="alert"
          className={`p-4 rounded border flex items-start gap-3 text-sm ${
            status.type === 'success'
              ? 'bg-[#11261B] border-[#166534] text-[#BBF7D0]'
              : 'bg-[#2A1215] border-[#7F1D1D] text-[#FECACA]'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="contact-name" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
            Your Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter your full name"
            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
            Email Address
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="name@organization.com"
            className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
          Subject
        </label>
        <input
          id="contact-subject"
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Booking inquiry, press request, sync licensing..."
          className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-xs font-semibold text-[#D4D4D8] mb-1.5">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={5}
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Write your detailed inquiry..."
          className="w-full bg-[#09090B] border border-[#27272E] rounded px-3.5 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-3 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        <span>{submitting ? 'Sending Message...' : 'Submit Inquiry'}</span>
      </button>
    </form>
  );
}

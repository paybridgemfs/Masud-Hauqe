import React from 'react';
import { getPublicWebsiteData } from '@/lib/db.js';
import ContactFormClient from '@/components/forms/ContactFormClient.jsx';
import { Mail, MapPin } from 'lucide-react';

export const revalidate = 60;

export const metadata = {
  title: 'Contact & Booking — Masud Hauqe',
  description: 'Contact the management desk of Masud Hauqe for bookings, press, and licensing inquiries.',
};

export default async function ContactPage() {
  const { artist, settings, socialLinks } = await getPublicWebsiteData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#C8A464]">
              CORRESPONDENCE & BOOKING
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#F4F1EA] mt-1">
              Get in Touch with {artist?.name || 'Masud Hauqe'}
            </h1>
            <p className="text-sm text-[#9A9AA2] mt-2 leading-relaxed">
              For concert bookings, studio collaborations, press inquiries, or master sync licensing, use the direct form or management coordinates below.
            </p>
          </div>

          <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-4">
            {settings.contactEmail && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#C8A464] shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-[#8E8E96]">MANAGEMENT EMAIL</p>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="text-sm font-semibold text-[#F4F1EA] hover:text-[#C8A464]"
                  >
                    {settings.contactEmail}
                  </a>
                </div>
              </div>
            )}

            {(settings.contactLocation || artist?.location) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#C8A464] shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-[#8E8E96]">REPRESENTATION DESK</p>
                  <p className="text-sm font-semibold text-[#F4F1EA]">
                    {settings.contactLocation || artist?.location}
                  </p>
                </div>
              </div>
            )}
          </div>

          {socialLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-[#8E8E96]">
                OFFICIAL SOCIAL CHANNELS
              </p>
              <div className="flex flex-wrap gap-2.5">
                {socialLinks.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded border border-[#27272E] text-xs font-semibold text-[#F4F1EA] hover:border-[#C8A464] hover:text-[#C8A464]"
                  >
                    {s.platform}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          <ContactFormClient />
        </div>
      </div>
    </div>
  );
}

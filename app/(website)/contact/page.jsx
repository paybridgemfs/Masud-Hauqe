import React from 'react';
import { getPublicWebsiteData } from '@/lib/db.js';
import { buildPageSocialMetadata } from '@/lib/seo.js';
import ContactFormClient from '@/components/forms/ContactFormClient.jsx';
import SocialMediaLinks from '@/components/website/SocialMediaLinks.jsx';
import { Mail, MapPin } from 'lucide-react';

export const revalidate = 60;

export async function generateMetadata() {
  return buildPageSocialMetadata({ pageId: 'contact', path: '/contact' });
}

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
              Get in Touch{artist?.name ? ` with ${artist.name}` : ''}
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
            <div className="space-y-2.5">
              <p className="text-xs font-semibold tracking-wider text-[#8E8E96]">
                OFFICIAL SOCIAL CHANNELS
              </p>
              <SocialMediaLinks socialLinks={socialLinks} variant="buttons" />
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

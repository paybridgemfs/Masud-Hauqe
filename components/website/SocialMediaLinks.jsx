'use client';

import React from 'react';
import {
  Facebook,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Github,
  Twitch,
  Music,
  Music2,
  Headphones,
  Radio,
  Disc3,
  Video,
  MessageCircle,
  Send,
  Mail,
  Globe,
  Share2,
  ExternalLink,
} from 'lucide-react';

/**
 * Dynamically detects the social platform name and icon key from a URL,
 * platform label, or explicit icon key.
 */
export function resolveSocialPlatformInfo(itemOrUrl = '', fallbackPlatform = '', explicitIcon = '') {
  const rawUrl =
    typeof itemOrUrl === 'object' && itemOrUrl !== null
      ? String(itemOrUrl.url || '')
      : String(itemOrUrl || '');
  const rawPlatform =
    typeof itemOrUrl === 'object' && itemOrUrl !== null
      ? String(itemOrUrl.platform || fallbackPlatform || '')
      : String(fallbackPlatform || '');
  const rawIcon =
    typeof itemOrUrl === 'object' && itemOrUrl !== null
      ? String(itemOrUrl.icon || explicitIcon || '')
      : String(explicitIcon || '');

  const combined = `${rawUrl} ${rawPlatform} ${rawIcon}`.toLowerCase();

  let hostname = '';
  try {
    if (rawUrl) {
      const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    }
  } catch {
    hostname = '';
  }

  if (
    hostname.includes('facebook.com') ||
    hostname.includes('fb.com') ||
    hostname.includes('fb.me') ||
    hostname.includes('fb.watch') ||
    combined.includes('facebook')
  ) {
    return { key: 'facebook', label: rawPlatform || 'Facebook', Icon: Facebook };
  }

  if (
    hostname.includes('youtube.com') ||
    hostname.includes('youtu.be') ||
    combined.includes('youtube')
  ) {
    return { key: 'youtube', label: rawPlatform || 'YouTube', Icon: Youtube };
  }

  if (
    hostname.includes('instagram.com') ||
    hostname.includes('instagr.am') ||
    combined.includes('instagram')
  ) {
    return { key: 'instagram', label: rawPlatform || 'Instagram', Icon: Instagram };
  }

  if (
    hostname.includes('twitter.com') ||
    hostname.includes('x.com') ||
    combined.includes('twitter') ||
    /\bx\b/.test(combined)
  ) {
    return { key: 'twitter', label: rawPlatform || 'X (Twitter)', Icon: Twitter };
  }

  if (hostname.includes('linkedin.com') || combined.includes('linkedin')) {
    return { key: 'linkedin', label: rawPlatform || 'LinkedIn', Icon: Linkedin };
  }

  if (hostname.includes('spotify.com') || combined.includes('spotify')) {
    return { key: 'spotify', label: rawPlatform || 'Spotify', Icon: Disc3 };
  }

  if (
    hostname.includes('music.apple.com') ||
    hostname.includes('itunes.apple.com') ||
    combined.includes('apple music') ||
    combined.includes('itunes')
  ) {
    return { key: 'apple-music', label: rawPlatform || 'Apple Music', Icon: Music };
  }

  if (hostname.includes('soundcloud.com') || combined.includes('soundcloud')) {
    return { key: 'soundcloud', label: rawPlatform || 'SoundCloud', Icon: Headphones };
  }

  if (hostname.includes('tiktok.com') || combined.includes('tiktok')) {
    return { key: 'tiktok', label: rawPlatform || 'TikTok', Icon: Video };
  }

  if (
    hostname.includes('bandcamp.com') ||
    hostname.includes('audiomack.com') ||
    hostname.includes('deezer.com') ||
    hostname.includes('tidal.com') ||
    combined.includes('bandcamp') ||
    combined.includes('audiomack') ||
    combined.includes('deezer') ||
    combined.includes('tidal')
  ) {
    const inferredLabel = hostname
      ? hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1)
      : 'Music Stream';
    return { key: 'music-stream', label: rawPlatform || inferredLabel, Icon: Radio };
  }

  if (hostname.includes('twitch.tv') || combined.includes('twitch')) {
    return { key: 'twitch', label: rawPlatform || 'Twitch', Icon: Twitch };
  }

  if (hostname.includes('github.com') || combined.includes('github')) {
    return { key: 'github', label: rawPlatform || 'GitHub', Icon: Github };
  }

  if (
    hostname.includes('wa.me') ||
    hostname.includes('whatsapp.com') ||
    hostname.includes('discord.gg') ||
    hostname.includes('discord.com') ||
    combined.includes('whatsapp') ||
    combined.includes('discord') ||
    combined.includes('messenger')
  ) {
    const inferred = hostname.includes('discord') || combined.includes('discord') ? 'Discord' : 'WhatsApp';
    return { key: 'chat', label: rawPlatform || inferred, Icon: MessageCircle };
  }

  if (
    hostname.includes('t.me') ||
    hostname.includes('telegram.org') ||
    hostname.includes('telegram.me') ||
    combined.includes('telegram')
  ) {
    return { key: 'telegram', label: rawPlatform || 'Telegram', Icon: Send };
  }

  if (rawUrl.startsWith('mailto:') || combined.includes('email') || combined.includes('mail')) {
    return { key: 'mail', label: rawPlatform || 'Email', Icon: Mail };
  }

  if (combined.includes('music') || combined.includes('audio')) {
    return { key: 'music', label: rawPlatform || 'Music Profile', Icon: Music2 };
  }

  if (combined.includes('share') || combined.includes('social')) {
    return { key: 'social', label: rawPlatform || 'Social Profile', Icon: Share2 };
  }

  // Fallback: derive readable platform name from hostname if platform is empty
  let derivedName = rawPlatform;
  if (!derivedName && hostname) {
    const base = hostname.split('.')[0] || 'Website';
    derivedName = base.charAt(0).toUpperCase() + base.slice(1);
  }

  return {
    key: 'globe',
    label: derivedName || 'Official Link',
    Icon: Globe,
  };
}

/**
 * Renders a single dynamically resolved social platform icon.
 */
export function SocialPlatformIcon({ item, url = '', platform = '', icon = '', className = 'w-4 h-4' }) {
  const { Icon } = resolveSocialPlatformInfo(item || { url, platform, icon });
  return <Icon className={className} />;
}

/**
 * Reusable Social Media Links component supporting multiple display variants:
 * - 'footer-icons': Compact circular/square icon buttons for Footer
 * - 'footer-list': Icon + Platform name list for Footer column
 * - 'buttons': Editorial icon + label buttons for About / Contact / Homepage sections
 */
export default function SocialMediaLinks({
  socialLinks = [],
  variant = 'buttons',
  className = '',
}) {
  const visibleLinks = (socialLinks || []).filter((item) => item && item.url && item.isVisible !== false);

  if (visibleLinks.length === 0) {
    return null;
  }

  if (variant === 'footer-icons') {
    return (
      <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
        {visibleLinks.map((social) => {
          const { label, Icon } = resolveSocialPlatformInfo(social);
          return (
            <a
              key={social.id || social.url}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow on ${label}`}
              title={label}
              className="w-9 h-9 rounded bg-[#121217] border border-[#26262F] text-[#D4D4D8] hover:text-[#09090B] hover:bg-[#C8A464] hover:border-[#C8A464] flex items-center justify-center transition-colors"
            >
              <Icon className="w-4 h-4" />
            </a>
          );
        })}
      </div>
    );
  }

  if (variant === 'footer-list') {
    return (
      <ul className={`space-y-2 text-sm ${className}`}>
        {visibleLinks.map((social) => {
          const { label, Icon } = resolveSocialPlatformInfo(social);
          return (
            <li key={social.id || social.url}>
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 text-[#B4B4BC] hover:text-[#C8A464] transition-colors"
              >
                <span className="w-7 h-7 rounded bg-[#121217] border border-[#25252E] group-hover:border-[#C8A464]/60 group-hover:bg-[#1A1814] flex items-center justify-center text-[#C8A464] transition-colors shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="font-medium">{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  // Default 'buttons' variant (used on Artist About Page, Contact Page, and Homepage Social Section)
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {visibleLinks.map((social) => {
        const { label, Icon } = resolveSocialPlatformInfo(social);
        return (
          <a
            key={social.id || social.url}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded bg-[#111115] border border-[#2A2A32] hover:border-[#C8A464] text-xs font-semibold text-[#F4F1EA] hover:text-[#C8A464] transition-colors"
          >
            <Icon className="w-4 h-4 text-[#C8A464] group-hover:scale-110 transition-transform shrink-0" />
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 text-[#71717A] group-hover:text-[#C8A464] transition-colors shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

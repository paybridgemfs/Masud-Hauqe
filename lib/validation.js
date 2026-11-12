import { z } from 'zod';

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `item-${Date.now().toString(36)}`;
}

export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
  } catch {
    return null;
  }
  return null;
}

export function formatIsoDuration(isoDuration) {
  if (!isoDuration || typeof isoDuration !== 'string') return '0:00';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(80),
  password: z.string().min(1, 'Password is required').max(200),
  rememberMe: z.boolean().optional().default(false),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(6, 'New password must be at least 6 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const artistUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Artist name is required').max(120),
  slug: z.string().trim().min(1).max(120).optional(),
  shortBiography: z.string().trim().max(1000).optional().default(''),
  biography: z.string().trim().max(10000).optional().default(''),
  careerInfo: z.string().trim().max(5000).optional().default(''),
  musicalBg: z.string().trim().max(5000).optional().default(''),
  profileImage: z.string().trim().max(1024).optional().default(''),
  profileImageFileId: z.string().trim().max(256).optional().default(''),
  coverImage: z.string().trim().max(1024).optional().default(''),
  coverImageFileId: z.string().trim().max(256).optional().default(''),
  location: z.string().trim().max(160).optional().default(''),
  website: z.string().trim().max(512).optional().default(''),
  achievements: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().trim().min(1).max(200),
        year: z.string().trim().max(32).optional().default(''),
        description: z.string().trim().max(1000).optional().default(''),
      })
    )
    .optional()
    .default([]),
});

export const albumSchema = z.object({
  title: z.string().trim().min(1, 'Release title is required').max(200),
  slug: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional().default(''),
  coverImage: z.string().trim().max(1024).optional().default(''),
  coverImageFileId: z.string().trim().max(256).optional().default(''),
  releaseDate: z.string().trim().max(64).optional().default(''),
  isPublished: z.boolean().optional().default(true),
});

export const musicSchema = z.object({
  title: z.string().trim().min(1, 'Track title is required').max(200),
  slug: z.string().trim().max(200).optional(),
  artistName: z.string().trim().max(120).optional(),
  albumId: z.string().trim().max(128).nullable().optional().default(''),
  thumbnail: z.string().trim().max(1024).optional().default(''),
  thumbnailFileId: z.string().trim().max(256).optional().default(''),
  youtubeUrl: z.string().trim().max(512).optional().default(''),
  youtubeVideoId: z.string().trim().max(64).optional().default(''),
  duration: z.string().trim().max(32).optional().default('0:00'),
  audioProvider: z.string().trim().optional().default('google_drive'),
  audioFileId: z.string().trim().max(256).optional().default(''),
  audioFileName: z.string().trim().max(256).optional().default(''),
  audioMimeType: z.string().trim().max(64).optional().default('audio/mpeg'),
  audioFileSize: z.number().int().min(0).optional().default(0),
  uploadStatus: z
    .enum(['pending', 'uploading', 'uploaded', 'published', 'failed'])
    .optional()
    .default('published'),
  isPublished: z.boolean().optional().default(true),
  downloadEnabled: z.boolean().optional().default(true),
  includeYoutubeVideo: z.boolean().optional().default(false),
});

export const sectionSchema = z.object({
  name: z.string().trim().min(1, 'Section name is required').max(120),
  type: z.enum([
    'HERO',
    'HIGHLIGHTS_GRID',
    'ARTIST_INTRO',
    'FEATURED_MUSIC',
    'LATEST_RELEASES',
    'POPULAR_MUSIC',
    'ALBUMS',
    'BIOGRAPHY_PREVIEW',
    'MUSIC_VIDEOS',
    'GALLERY',
    'SOCIAL_LINKS',
    'CONTACT_SECTION',
  ]),
  position: z.number().int().min(0).max(1000).optional().default(0),
  isVisible: z.boolean().optional().default(true),
  content: z.record(z.string(), z.any()).optional().default({}),
  settings: z.record(z.string(), z.any()).optional().default({}),
});

export const contactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Your name is required').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  subject: z.string().trim().min(2, 'Subject is required').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(4000),
});

export const pageSchema = z.object({
  title: z.string().trim().min(1, 'Page title is required').max(200),
  slug: z.string().trim().min(1, 'Page slug is required').max(120),
  content: z.string().trim().min(1, 'Page content is required').max(50000),
  metaTitle: z.string().trim().max(200).optional().default(''),
  metaDescription: z.string().trim().max(500).optional().default(''),
  isPublished: z.boolean().optional().default(true),
});

export const gallerySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  imageUrl: z.string().trim().min(1, 'Uploaded image is required').max(1024),
  imageFileId: z.string().trim().max(256).optional().default(''),
  description: z.string().trim().max(1000).optional().default(''),
  position: z.number().int().min(0).optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

export const navigationItemSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(80),
  url: z.string().trim().min(1, 'URL is required').max(256),
  location: z.enum(['header', 'footer']).optional().default('header'),
  position: z.number().int().min(0).optional().default(0),
  isVisible: z.boolean().optional().default(true),
});

export const socialLinkSchema = z.object({
  platform: z.string().trim().min(1, 'Platform name is required').max(80),
  url: z.string().trim().url('Valid URL is required').max(512),
  icon: z.string().trim().max(64).optional().default('globe'),
  position: z.number().int().min(0).optional().default(0),
  isVisible: z.boolean().optional().default(true),
});

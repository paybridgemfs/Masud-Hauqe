import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './security.js';
import { getEnvConfig } from './env.js';
import { slugify } from './validation.js';
import {
  isRemotePostgresConfigured,
  loadStateFromPostgres,
  syncStateToPostgres,
  schedulePostgresSync,
} from './postgres-sync.js';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'relational-db.json');

function cuid() {
  return `mh_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`;
}

function getDefaultInitialState(adminPasswordHash) {
  const now = new Date().toISOString();
  const env = getEnvConfig();
  const artistId = 'masud-hauqe';
  const adminId = 'admin-bootstrap-1';

  return {
    schemaVersion: 1,
    migratedAt: now,
    admins: [
      {
        id: adminId,
        name: 'System Administrator',
        username: env.defaultAdminUsername || 'admin',
        email: 'mdsagormia179@gmail.com',
        passwordHash: adminPasswordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    artists: [
      {
        id: artistId,
        name: 'Masud Hauqe',
        slug: 'masud-hauqe',
        shortBiography:
          'Official musical archive, original compositions, and studio recordings of Masud Hauqe.',
        biography:
          'Masud Hauqe is a recording artist and composer whose work explores atmospheric arrangements, contemporary vocal expression, and timeless acoustic production. Every composition published on this platform is an authorized master recording delivered directly from the official archive.',
        careerInfo:
          'Independent recording artist and composer curating original studio works and live acoustic sessions.',
        musicalBg:
          'Rooted in contemporary melodic traditions blended with modern studio sound design and minimalist instrumentation.',
        profileImage: '',
        profileImageFileId: '',
        coverImage: '',
        coverImageFileId: '',
        location: '',
        website: '',
        socialLinks: [],
        achievements: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    albums: [],
    music: [],
    googleIntegrations: [
      {
        id: 'gdrive-primary',
        provider: 'google_drive',
        accountEmail: '',
        encryptedRefreshToken: '',
        uploadFolderId: '',
        uploadFolderName: 'Musics',
        musicFolderId: '',
        musicFolderName: 'Musics',
        imageFolderId: '',
        imageFolderName: 'Images',
        connected: false,
        lastUploadAt: null,
        lastUploadStatus: 'idle',
        connectedAt: null,
        updatedAt: now,
      },
    ],
    websiteSettings: [
      { id: 'set-site-name', key: 'siteName', value: 'Masud Hauqe', type: 'string', updatedAt: now },
      {
        id: 'set-site-tagline',
        key: 'siteTagline',
        value: 'Official Artist Portfolio & Master Audio Archive',
        type: 'string',
        updatedAt: now,
      },
      { id: 'set-logo-text', key: 'logoText', value: 'MASUD HAUQE', type: 'string', updatedAt: now },
      { id: 'set-logo-url', key: 'logoUrl', value: '', type: 'string', updatedAt: now },
      { id: 'set-favicon-url', key: 'faviconUrl', value: '', type: 'string', updatedAt: now },
      { id: 'set-language', key: 'defaultLanguage', value: 'en', type: 'string', updatedAt: now },
      { id: 'set-primary-color', key: 'primaryColor', value: '#C8A464', type: 'color', updatedAt: now },
      { id: 'set-secondary-color', key: 'secondaryColor', value: '#141417', type: 'color', updatedAt: now },
      { id: 'set-accent-color', key: 'accentColor', value: '#D4B475', type: 'color', updatedAt: now },
      { id: 'set-bg-color', key: 'backgroundColor', value: '#09090B', type: 'color', updatedAt: now },
      { id: 'set-text-color', key: 'textColor', value: '#F4F1EA', type: 'color', updatedAt: now },
      { id: 'set-border-color', key: 'borderColor', value: '#222226', type: 'color', updatedAt: now },
      { id: 'set-container-width', key: 'containerWidth', value: '1280px', type: 'string', updatedAt: now },
      { id: 'set-section-spacing', key: 'sectionSpacing', value: '5rem', type: 'string', updatedAt: now },
      { id: 'set-border-radius', key: 'borderRadius', value: '0.5rem', type: 'string', updatedAt: now },
      { id: 'set-sticky-header', key: 'stickyHeader', value: 'true', type: 'boolean', updatedAt: now },
      { id: 'set-header-cta-label', key: 'headerCtaLabel', value: 'Explore Music', type: 'string', updatedAt: now },
      { id: 'set-header-cta-url', key: 'headerCtaUrl', value: '/music', type: 'string', updatedAt: now },
      {
        id: 'set-footer-desc',
        key: 'footerDescription',
        value: 'Official digital repertoire, studio master streaming, and authorized archive of Masud Hauqe.',
        type: 'string',
        updatedAt: now,
      },
      {
        id: 'set-copyright',
        key: 'copyrightText',
        value: `© ${new Date().getFullYear()} Masud Hauqe. All Rights Reserved.`,
        type: 'string',
        updatedAt: now,
      },
      {
        id: 'set-contact-email',
        key: 'contactEmail',
        value: 'management@masudhauqe.com',
        type: 'string',
        updatedAt: now,
      },
      {
        id: 'set-contact-location',
        key: 'contactLocation',
        value: 'International Booking & Press Desk',
        type: 'string',
        updatedAt: now,
      },
    ],
    navigationItems: [
      { id: 'nav-1', label: 'Home', url: '/', location: 'header', position: 1, isVisible: true, parentId: null },
      { id: 'nav-2', label: 'Music', url: '/music', location: 'header', position: 2, isVisible: true, parentId: null },
      { id: 'nav-3', label: 'Releases', url: '/releases', location: 'header', position: 3, isVisible: true, parentId: null },
      { id: 'nav-4', label: 'About', url: '/about', location: 'header', position: 4, isVisible: true, parentId: null },
      { id: 'nav-5', label: 'Contact', url: '/contact', location: 'header', position: 5, isVisible: true, parentId: null },
      { id: 'nav-f1', label: 'Videos', url: '/videos', location: 'footer', position: 1, isVisible: true, parentId: null },
      { id: 'nav-f2', label: 'Gallery', url: '/gallery', location: 'footer', position: 2, isVisible: true, parentId: null },
      {
        id: 'nav-f3',
        label: 'Privacy Policy',
        url: '/legal/privacy-policy',
        location: 'footer',
        position: 3,
        isVisible: true,
        parentId: null,
      },
      {
        id: 'nav-f4',
        label: 'Terms & Conditions',
        url: '/legal/terms-and-conditions',
        location: 'footer',
        position: 4,
        isVisible: true,
        parentId: null,
      },
      {
        id: 'nav-f5',
        label: 'Copyright & Usage',
        url: '/legal/copyright-music-usage',
        location: 'footer',
        position: 5,
        isVisible: true,
        parentId: null,
      },
    ],
    socialLinks: [],
    sections: [
      {
        id: 'sec-hero',
        name: 'Editorial Hero Section',
        type: 'HERO',
        position: 1,
        isVisible: true,
        content: {
          kicker: 'OFFICIAL ARTIST ARCHIVE',
          headline: 'Masud Hauqe',
          subheadline:
            'Original studio recordings, sonic monographs, and authorized high-resolution MP3 releases.',
          primaryCtaText: 'Listen to Archive',
          primaryCtaUrl: '/music',
          secondaryCtaText: 'Artist Monograph',
          secondaryCtaUrl: '/about',
        },
        settings: { layout: 'split-editorial', theme: 'obsidian-gold' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-featured-music',
        name: 'Featured & Latest Releases',
        type: 'FEATURED_MUSIC',
        position: 2,
        isVisible: true,
        content: {
          kicker: 'SELECTED REPERTOIRE',
          heading: 'Published Master Recordings',
          subheading:
            'Stream directly in the persistent studio player or download authorized MP3 masters when enabled.',
          limit: 6,
        },
        settings: { columns: 3 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-albums',
        name: 'Official Releases & Anthologies',
        type: 'ALBUMS',
        position: 3,
        isVisible: true,
        content: {
          kicker: 'DISCOGRAPHY',
          heading: 'Official Releases & Collections',
          subheading: 'Curated multi-track releases and conceptual bodies of work.',
        },
        settings: { columns: 3 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-bio-preview',
        name: 'Artist Biography Preview',
        type: 'BIOGRAPHY_PREVIEW',
        position: 4,
        isVisible: true,
        content: {
          kicker: 'ARTIST PORTRAIT',
          heading: 'The Sonic Architecture of Masud Hauqe',
          ctaText: 'Read Full Biography',
          ctaUrl: '/about',
        },
        settings: { style: 'monograph' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-videos',
        name: 'Official YouTube Sessions',
        type: 'MUSIC_VIDEOS',
        position: 5,
        isVisible: true,
        content: {
          kicker: 'VISUAL ARCHIVE',
          heading: 'Official Video Performances',
          subheading: 'Embedded directly from official YouTube releases associated with published works.',
        },
        settings: { limit: 4 },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sec-contact',
        name: 'Direct Management & Booking Inquiry',
        type: 'CONTACT_SECTION',
        position: 6,
        isVisible: true,
        content: {
          kicker: 'CORRESPONDENCE',
          heading: 'Management, Licensing & Press Inquiries',
          subheading:
            'Connect directly with the management desk of Masud Hauqe for performance bookings, sync licensing, or press requests.',
          ctaText: 'Open Inquiry Desk',
          ctaUrl: '/contact',
        },
        settings: {},
        createdAt: now,
        updatedAt: now,
      },
    ],
    pages: [
      {
        id: 'page-privacy',
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content:
          'Masud Hauqe Official Platform respects visitor privacy. We collect only the information voluntarily submitted through our Contact form (name, email, subject, and message) strictly to respond to your inquiry.\n\nAudio streaming and MP3 downloads are delivered via Google Drive API v3 public file permissions. Administrator authentication uses HttpOnly signed session cookies.',
        metaTitle: 'Privacy Policy — Masud Hauqe',
        metaDescription: 'Privacy policy and data handling practices for the official Masud Hauqe website.',
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'page-terms',
        title: 'Terms and Conditions',
        slug: 'terms-and-conditions',
        content:
          'By accessing the official website of Masud Hauqe, you agree to use the streaming audio player and any enabled MP3 downloads strictly for personal, non-commercial listening unless a separate written sync or master use license has been executed.\n\nRedistribution, unauthorized re-uploading, or commercial exploitation of any audio recording or visual artwork on this platform is prohibited.',
        metaTitle: 'Terms and Conditions — Masud Hauqe',
        metaDescription: 'Terms and conditions governing use of the Masud Hauqe music platform.',
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'page-copyright',
        title: 'Copyright and Music Usage Information',
        slug: 'copyright-music-usage',
        content:
          'All musical compositions, lyrics, master audio recordings, and artwork published on this website are the intellectual property of Masud Hauqe unless otherwise credited.\n\nWhen MP3 download is enabled on a track, listeners are granted a personal listening copy. Note that publicly shared Google Drive delivery files are governed by copyright law; download controls on the site govern the interface download button while copyright protection applies globally to the underlying audio files.',
        metaTitle: 'Copyright & Music Usage — Masud Hauqe',
        metaDescription: 'Copyright ownership and music licensing guidelines for Masud Hauqe recordings.',
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    gallery: [],
    contactMessages: [],
    seoSettings: [
      {
        id: 'seo-global',
        page: 'global',
        metaTitle: 'Masud Hauqe — Official Artist Website & Music Archive',
        metaDescription:
          'Official website of recording artist Masud Hauqe. Stream original studio compositions, explore releases, and download authorized MP3 tracks.',
        canonicalUrl: env.appUrl.replace(/\/+$/, ''),
        ogImage: '',
        updatedAt: now,
      },
      {
        id: 'seo-home',
        page: 'home',
        metaTitle: 'Masud Hauqe — Official Artist Website & Music Archive',
        metaDescription:
          'Official website of recording artist Masud Hauqe. Stream original studio compositions, explore releases, and download authorized MP3 tracks.',
        canonicalUrl: env.appUrl.replace(/\/+$/, ''),
        ogImage: '',
        updatedAt: now,
      },
      {
        id: 'seo-music',
        page: 'music',
        metaTitle: 'Music Library — Masud Hauqe',
        metaDescription: 'Browse, stream, and download official published recordings by Masud Hauqe.',
        canonicalUrl: `${env.appUrl.replace(/\/+$/, '')}/music`,
        ogImage: '',
        updatedAt: now,
      },
      {
        id: 'seo-releases',
        page: 'releases',
        metaTitle: 'Official Releases & Discography — Masud Hauqe',
        metaDescription: 'Explore official studio releases, multi-track collections, and anthologies by Masud Hauqe.',
        canonicalUrl: `${env.appUrl.replace(/\/+$/, '')}/releases`,
        ogImage: '',
        updatedAt: now,
      },
      {
        id: 'seo-videos',
        page: 'videos',
        metaTitle: 'Official Music Videos — Masud Hauqe',
        metaDescription: 'Watch official YouTube video sessions and visual performances by Masud Hauqe.',
        canonicalUrl: `${env.appUrl.replace(/\/+$/, '')}/videos`,
        ogImage: '',
        updatedAt: now,
      },
      {
        id: 'seo-about',
        page: 'about',
        metaTitle: 'About Masud Hauqe — Biography & Musical Background',
        metaDescription: 'Read the biography, musical background, and career monograph of Masud Hauqe.',
        canonicalUrl: `${env.appUrl.replace(/\/+$/, '')}/about`,
        ogImage: '',
        updatedAt: now,
      },
      {
        id: 'seo-gallery',
        page: 'gallery',
        metaTitle: 'Photography & Visual Gallery — Masud Hauqe',
        metaDescription: 'Editorial photography, studio sessions, and live performance gallery of Masud Hauqe.',
        canonicalUrl: `${env.appUrl.replace(/\/+$/, '')}/gallery`,
        ogImage: '',
        updatedAt: now,
      },
      {
        id: 'seo-contact',
        page: 'contact',
        metaTitle: 'Contact & Booking Inquiries — Masud Hauqe',
        metaDescription: 'Connect with the management desk of Masud Hauqe for performance bookings, licensing, and press inquiries.',
        canonicalUrl: `${env.appUrl.replace(/\/+$/, '')}/contact`,
        ogImage: '',
        updatedAt: now,
      },
    ],
  };
}

const globalDb = globalThis.__mhDbStore || {
  memoryStore: null,
  initPromise: null,
  pgBootstrapped: false,
  cacheVersion: 1,
  cachedPublicData: null,
  cachedPublicVersion: 0,
};
globalThis.__mhDbStore = globalDb;

function readDiskStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading relational DB file:', err);
  }
  return null;
}

function writeDiskStore(state) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error persisting relational DB state:', err);
  }
}

async function writeDiskStoreAsync(state) {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(state, null, 2), 'utf8');
    await fs.promises.rename(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Error persisting relational DB state asynchronously:', err);
  }
}

async function revalidateNextCache() {
  try {
    const nextCache = await import('next/cache');
    if (typeof nextCache.revalidateTag === 'function') {
      nextCache.revalidateTag('website-data');
    }
    if (typeof nextCache.revalidatePath === 'function') {
      nextCache.revalidatePath('/', 'layout');
    }
  } catch {
    // Ignore when called outside of Next.js request context (e.g. CLI seed script)
  }
}

function normalizeReleaseLabelsInState(state) {
  if (!state) return false;
  let changed = false;
  const env = getEnvConfig();
  const baseUrl = (env.appUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const now = new Date().toISOString();

  if (Array.isArray(state.artists)) {
    state.artists = state.artists.map((artist) => {
      if (artist && typeof artist.website === 'string' && /\.run\.app/i.test(artist.website)) {
        changed = true;
        return { ...artist, website: '' };
      }
      return artist;
    });
  }

  if (Array.isArray(state.navigationItems)) {
    state.navigationItems = state.navigationItems.map((n) => {
      if (!n) return n;
      let nextLabel = n.label;
      let nextUrl = n.url;
      if (/^albums?$/i.test((n.label || '').trim()) || /album/i.test(n.label || '')) {
        nextLabel = 'Releases';
      }
      if (n.url === '/albums') {
        nextUrl = '/releases';
      }
      if (nextLabel !== n.label || nextUrl !== n.url) {
        changed = true;
        return { ...n, label: nextLabel, url: nextUrl };
      }
      return n;
    });
  }

  if (Array.isArray(state.sections)) {
    state.sections = state.sections.map((s) => {
      if (s && s.type === 'ALBUMS') {
        const nextName =
          !s.name || /album/i.test(s.name) ? 'Official Releases & Anthologies' : s.name;
        const rawHeading = s.content?.heading || '';
        const nextHeading =
          !rawHeading || /album/i.test(rawHeading)
            ? 'Official Releases & Collections'
            : rawHeading;
        if (nextName !== s.name || nextHeading !== rawHeading) {
          changed = true;
          return {
            ...s,
            name: nextName,
            content: { ...(s.content || {}), heading: nextHeading },
          };
        }
      }
      return s;
    });
  }

  const seoRouteConfig = [
    {
      page: 'global',
      path: '',
      title: 'Masud Hauqe — Official Artist Website & Music Archive',
      desc: 'Official website of recording artist Masud Hauqe. Stream original studio compositions, explore releases, and download authorized MP3 tracks.',
    },
    {
      page: 'home',
      path: '',
      title: 'Masud Hauqe — Official Artist Website & Music Archive',
      desc: 'Official website of recording artist Masud Hauqe. Stream original studio compositions, explore releases, and download authorized MP3 tracks.',
    },
    {
      page: 'music',
      path: '/music',
      title: 'Music Library — Masud Hauqe',
      desc: 'Browse, stream, and download official published recordings by Masud Hauqe.',
    },
    {
      page: 'releases',
      path: '/releases',
      title: 'Official Releases & Discography — Masud Hauqe',
      desc: 'Explore official studio releases, multi-track collections, and anthologies by Masud Hauqe.',
    },
    {
      page: 'videos',
      path: '/videos',
      title: 'Official Music Videos — Masud Hauqe',
      desc: 'Watch official YouTube video sessions and visual performances by Masud Hauqe.',
    },
    {
      page: 'about',
      path: '/about',
      title: 'About Masud Hauqe — Biography & Musical Background',
      desc: 'Read the biography, musical background, and career monograph of Masud Hauqe.',
    },
    {
      page: 'gallery',
      path: '/gallery',
      title: 'Photography & Visual Gallery — Masud Hauqe',
      desc: 'Editorial photography, studio sessions, and live performance gallery of Masud Hauqe.',
    },
    {
      page: 'contact',
      path: '/contact',
      title: 'Contact & Booking Inquiries — Masud Hauqe',
      desc: 'Connect with the management desk of Masud Hauqe for performance bookings, licensing, and press inquiries.',
    },
  ];

  if (!Array.isArray(state.seoSettings)) {
    state.seoSettings = [];
    changed = true;
  }

  state.seoSettings = state.seoSettings.map((s) => {
    if (s && s.page === 'albums') {
      changed = true;
      return { ...s, page: 'releases' };
    }
    return s;
  });

  for (const cfg of seoRouteConfig) {
    const expectedCanonical = `${baseUrl}${cfg.path}`;
    const idx = state.seoSettings.findIndex((s) => s && s.page === cfg.page);
    if (idx !== -1) {
      const current = state.seoSettings[idx];
      if (
        !current.canonicalUrl ||
        current.canonicalUrl.endsWith('/albums') ||
        /localhost:3000|\.run\.app/i.test(current.canonicalUrl)
      ) {
        if (current.canonicalUrl !== expectedCanonical) {
          state.seoSettings[idx] = { ...current, canonicalUrl: expectedCanonical };
          changed = true;
        }
      }
    } else {
      state.seoSettings.push({
        id: `seo-${cfg.page}`,
        page: cfg.page,
        metaTitle: cfg.title,
        metaDescription: cfg.desc,
        canonicalUrl: expectedCanonical,
        ogImage: '',
        updatedAt: now,
      });
      changed = true;
    }
  }

  return changed;
}

export async function ensureDatabaseInitialized() {
  if (globalDb.memoryStore && (!isRemotePostgresConfigured() || globalDb.pgBootstrapped)) {
    if (normalizeReleaseLabelsInState(globalDb.memoryStore)) {
      writeDiskStore(globalDb.memoryStore);
      if (isRemotePostgresConfigured()) {
        schedulePostgresSync(globalDb.memoryStore);
      }
      globalDb.cacheVersion += 1;
      globalDb.cachedPublicData = null;
    }
    return globalDb.memoryStore;
  }

  if (globalDb.initPromise) {
    return globalDb.initPromise;
  }

  globalDb.initPromise = (async () => {
    const env = getEnvConfig();

    // 1. If a real PostgreSQL DATABASE_URL is configured, check PostgreSQL first
    if (isRemotePostgresConfigured()) {
      try {
        const pgState = await loadStateFromPostgres();
        if (pgState && Array.isArray(pgState.admins) && pgState.admins.length > 0) {
          if (normalizeReleaseLabelsInState(pgState)) {
            schedulePostgresSync(pgState);
          }
          writeDiskStore(pgState);
          globalDb.memoryStore = pgState;
          globalDb.pgBootstrapped = true;
          globalDb.cacheVersion += 1;
          globalDb.cachedPublicData = null;
          return globalDb.memoryStore;
        }
      } catch (pgErr) {
        console.error('PostgreSQL initial load warning:', pgErr);
      }
    }

    const existing = readDiskStore();
    if (existing && Array.isArray(existing.admins) && existing.admins.length > 0) {
      let dirty = normalizeReleaseLabelsInState(existing);
      if (!Array.isArray(existing.artists) || existing.artists.length === 0) {
        const now = new Date().toISOString();
        existing.artists = [
          {
            id: 'masud-hauqe',
            name: 'Masud Hauqe',
            slug: 'masud-hauqe',
            shortBiography: 'Official musical archive and studio recordings of Masud Hauqe.',
            biography: '',
            careerInfo: '',
            musicalBg: '',
            profileImage: '',
            profileImageFileId: '',
            coverImage: '',
            coverImageFileId: '',
            location: '',
            website: '',
            socialLinks: [],
            achievements: [],
            createdAt: now,
            updatedAt: now,
          },
        ];
        dirty = true;
      }
      if (dirty) {
        writeDiskStore(existing);
      }
      // If remote Postgres is configured, never overwrite it with stale local disk store on boot
      globalDb.memoryStore = existing;
      globalDb.cacheVersion += 1;
      globalDb.cachedPublicData = null;
      return globalDb.memoryStore;
    }

    if (env.isProduction && env.requireCustomAdminPassword && env.defaultAdminPassword === 'admin') {
      throw new Error(
        'Production security policy REQUIRE_CUSTOM_ADMIN_PASSWORD=true requires DEFAULT_ADMIN_PASSWORD to be changed from "admin".'
      );
    }

    const passwordHash = await hashPassword(env.defaultAdminPassword || 'admin');
    const initialState = getDefaultInitialState(passwordHash);
    writeDiskStore(initialState);
    globalDb.memoryStore = initialState;
    globalDb.cacheVersion += 1;
    globalDb.cachedPublicData = null;
    return globalDb.memoryStore;
  })();

  try {
    return await globalDb.initPromise;
  } finally {
    globalDb.initPromise = null;
  }
}

export async function getDbState() {
  return ensureDatabaseInitialized();
}

export function appendAuditRecord() {
  // Audit logs removed per user request
  return null;
}

export async function updateDbState(mutator, options = {}) {
  const state = await ensureDatabaseInitialized();
  const cloned = structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  const result = await mutator(cloned);

  globalDb.memoryStore = cloned;
  globalDb.cacheVersion += 1;
  globalDb.cachedPublicData = null;

  // Non-blocking disk persistence & Next.js cache revalidation
  writeDiskStoreAsync(cloned);
  revalidateNextCache();

  if (isRemotePostgresConfigured()) {
    if (options.awaitRemoteSync) {
      try {
        await syncStateToPostgres(cloned);
      } catch (pgUpdateErr) {
        console.error('Failed to sync state update to PostgreSQL:', pgUpdateErr);
      }
    } else {
      schedulePostgresSync(cloned);
    }
  }

  return { state: cloned, result };
}

export async function logAuditEvent() {
  // Audit logs removed per user request
  return null;
}

export function sortAlbumTracks(tracks = []) {
  return [...tracks].sort((a, b) => {
    const orderA =
      typeof a.trackOrder === 'number' && a.trackOrder > 0 ? a.trackOrder : 999999;
    const orderB =
      typeof b.trackOrder === 'number' && b.trackOrder > 0 ? b.trackOrder : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
}

// High-level relational query helpers with Next.js Data Cache (unstable_cache) + in-memory versioned caching
async function computePublicWebsiteData() {
  const db = await getDbState();

  if (
    globalDb.cachedPublicData &&
    globalDb.cachedPublicVersion === globalDb.cacheVersion
  ) {
    return globalDb.cachedPublicData;
  }

  const artist = db.artists?.[0] || null;

  const settingsMap = {};
  for (const s of db.websiteSettings || []) {
    settingsMap[s.key] = s.value;
  }

  const publishedAlbums = (db.albums || [])
    .filter((a) => a.isPublished)
    .map((album) => {
      const tracks = sortAlbumTracks(
        (db.music || []).filter((m) => m.albumId === album.id && m.isPublished)
      );
      return { ...album, artist, tracks, trackCount: tracks.length };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const albumMap = new Map((db.albums || []).map((a) => [a.id, a]));

  const publishedMusic = (db.music || [])
    .filter((m) => m.isPublished)
    .map((track) => ({
      ...track,
      artist,
      album: track.albumId ? albumMap.get(track.albumId) || null : null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const popularMusic = [...publishedMusic].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

  const visibleSections = [...(db.sections || [])]
    .filter((s) => s.isVisible)
    .map((s) => {
      if (s.type === 'ALBUMS') {
        const nextName =
          !s.name || /album/i.test(s.name) ? 'Official Releases & Anthologies' : s.name;
        const rawHeading = s.content?.heading || '';
        const nextHeading =
          !rawHeading || /album/i.test(rawHeading)
            ? 'Official Releases & Collections'
            : rawHeading;
        return {
          ...s,
          name: nextName,
          content: { ...(s.content || {}), heading: nextHeading },
        };
      }
      return s;
    })
    .sort((a, b) => a.position - b.position);

  const headerNav = [...(db.navigationItems || [])]
    .filter((n) => n.isVisible && n.location === 'header')
    .map((n) => ({
      ...n,
      label: /album/i.test(n.label || '') ? 'Releases' : n.label,
      url: n.url === '/albums' ? '/releases' : n.url,
    }))
    .sort((a, b) => a.position - b.position);

  const footerNav = [...(db.navigationItems || [])]
    .filter((n) => n.isVisible && n.location === 'footer')
    .map((n) => ({
      ...n,
      label: /album/i.test(n.label || '') ? 'Releases' : n.label,
      url: n.url === '/albums' ? '/releases' : n.url,
    }))
    .sort((a, b) => a.position - b.position);

  const visibleSocials = [...(db.socialLinks || [])]
    .filter((s) => s.isVisible)
    .sort((a, b) => a.position - b.position);

  const publishedGallery = [...(db.gallery || [])]
    .filter((g) => g.isPublished)
    .sort((a, b) => a.position - b.position);

  const computed = {
    artist,
    settings: settingsMap,
    rawSettings: db.websiteSettings || [],
    publishedMusic,
    popularMusic,
    publishedAlbums,
    visibleSections,
    headerNav,
    footerNav,
    socialLinks: visibleSocials,
    gallery: publishedGallery,
    pages: (db.pages || []).filter((p) => p.isPublished),
    seoSettings: db.seoSettings || [],
  };

  globalDb.cachedPublicData = computed;
  globalDb.cachedPublicVersion = globalDb.cacheVersion;

  return computed;
}

export async function getPublicWebsiteData() {
  if (
    globalDb.cachedPublicData &&
    globalDb.cachedPublicVersion === globalDb.cacheVersion
  ) {
    return globalDb.cachedPublicData;
  }

  try {
    const { unstable_cache } = await import('next/cache');
    const getCached = unstable_cache(
      async () => computePublicWebsiteData(),
      ['mh-public-website-data'],
      { tags: ['website-data'], revalidate: 60 }
    );
    return await getCached();
  } catch {
    return computePublicWebsiteData();
  }
}

export async function createUniqueSlug(collectionArray, baseTitle, excludeId = null) {
  const base = slugify(baseTitle);
  let candidate = base;
  let counter = 2;
  while (collectionArray.some((item) => item.slug === candidate && item.id !== excludeId)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

export { cuid };


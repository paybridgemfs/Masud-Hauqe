import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, appendAuditRecord, cuid } from '@/lib/db.js';
import {
  slugify,
  navigationItemSchema,
  socialLinkSchema,
  pageSchema,
  gallerySchema,
} from '@/lib/validation.js';
import { deleteFileFromGoogleDrive } from '@/lib/google-drive.js';
import { sanitizeSafeUrl } from '@/lib/security.js';

export async function GET() {
  const [{ authorized }, db] = await Promise.all([requireAdminSession(), getDbState()]);
  const settingsMap = {};
  for (const s of db.websiteSettings || []) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({
    ok: true,
    settings: settingsMap,
    websiteSettings: db.websiteSettings || [],
    navigationItems: authorized
      ? db.navigationItems || []
      : (db.navigationItems || []).filter((n) => n.isVisible),
    socialLinks: authorized
      ? db.socialLinks || []
      : (db.socialLinks || []).filter((s) => s.isVisible),
    pages: authorized ? db.pages || [] : (db.pages || []).filter((p) => p.isPublished),
    gallery: authorized ? db.gallery || [] : (db.gallery || []).filter((g) => g.isPublished),
    seoSettings: db.seoSettings || [],
  });
}

const URL_SETTING_KEYS = new Set(['logoUrl', 'faviconUrl', 'headerCtaUrl']);

export async function PUT(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { group } = body;
    const now = new Date().toISOString();
    const oldDriveFileIdsToDelete = [];

    if (group === 'websiteSettings' && body.values && typeof body.values === 'object') {
      await updateDbState((state) => {
        for (const [key, val] of Object.entries(body.values)) {
          let safeVal = String(val ?? '').slice(0, 5000);
          if (URL_SETTING_KEYS.has(key)) {
            safeVal = sanitizeSafeUrl(safeVal, { allowRelative: true, fallback: '' });
          }
          const existing = state.websiteSettings.find((s) => s.key === key);
          if (
            (key === 'logoFileId' || key === 'faviconFileId') &&
            existing?.value &&
            existing.value !== safeVal
          ) {
            oldDriveFileIdsToDelete.push(existing.value);
          }
          if (existing) {
            existing.value = safeVal;
            existing.updatedAt = now;
          } else {
            state.websiteSettings.push({
              id: cuid(),
              key: String(key).slice(0, 120),
              value: safeVal,
              type: key.toLowerCase().includes('color') ? 'color' : 'string',
              updatedAt: now,
            });
          }
        }
        appendAuditRecord(state, {
          adminId: admin.id,
          action: 'WEBSITE_SETTINGS_UPDATED',
          entityType: 'WebsiteSetting',
          entityId: 'global',
          metadata: { keys: Object.keys(body.values) },
        });
      });
    } else if (group === 'navigationItems') {
      const { action, item, items } = body;
      if (action === 'create' && item) {
        const parsed = navigationItemSchema.safeParse(item);
        if (!parsed.success) {
          return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message || 'Invalid navigation item.' },
            { status: 400 }
          );
        }
      } else if (action === 'replaceAll') {
        if (!Array.isArray(items)) {
          return NextResponse.json(
            { ok: false, error: 'Navigation items array is required.' },
            { status: 400 }
          );
        }
        for (const entry of items) {
          const parsed = navigationItemSchema.safeParse(entry);
          if (!parsed.success) {
            return NextResponse.json(
              { ok: false, error: parsed.error.issues[0]?.message || 'Invalid navigation item.' },
              { status: 400 }
            );
          }
        }
      }

      await updateDbState((state) => {
        if (action === 'create' && item) {
          state.navigationItems.push({
            id: cuid(),
            label: String(item.label || '').trim().slice(0, 80),
            url: sanitizeSafeUrl(String(item.url || '/'), {
              allowRelative: true,
              allowMailto: true,
              fallback: '/',
            }).slice(0, 256),
            location: item.location === 'footer' ? 'footer' : 'header',
            position: Number(item.position || state.navigationItems.length + 1),
            isVisible: item.isVisible !== false,
            parentId: null,
          });
        } else if (action === 'update' && item) {
          const target = state.navigationItems.find((n) => n.id === item.id);
          if (target) {
            if (typeof item.label === 'string' && item.label.trim()) {
              target.label = item.label.trim().slice(0, 80);
            }
            if (typeof item.url === 'string') {
              target.url = sanitizeSafeUrl(item.url, {
                allowRelative: true,
                allowMailto: true,
                fallback: '/',
              }).slice(0, 256);
            }
            if (item.location === 'header' || item.location === 'footer') {
              target.location = item.location;
            }
            if (typeof item.position === 'number') target.position = item.position;
            if (typeof item.isVisible === 'boolean') target.isVisible = item.isVisible;
          }
        } else if (action === 'delete' && item?.id) {
          state.navigationItems = state.navigationItems.filter((n) => n.id !== item.id);
        } else if (action === 'replaceAll' && Array.isArray(items)) {
          state.navigationItems = items.map((entry, idx) => ({
            id: typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : cuid(),
            label: String(entry.label || '').trim().slice(0, 80),
            url: sanitizeSafeUrl(String(entry.url || '/'), {
              allowRelative: true,
              allowMailto: true,
              fallback: '/',
            }).slice(0, 256),
            location: entry.location === 'footer' ? 'footer' : 'header',
            position: Number(entry.position || idx + 1),
            isVisible: entry.isVisible !== false,
            parentId: null,
          }));
        }
        appendAuditRecord(state, {
          adminId: admin.id,
          action: 'NAVIGATION_UPDATED',
          entityType: 'NavigationItem',
          entityId: item?.id || 'bulk',
          metadata: { action },
        });
      });
    } else if (group === 'socialLinks') {
      const { action, item } = body;
      if (action === 'create' && item) {
        const parsed = socialLinkSchema.safeParse(item);
        if (!parsed.success) {
          return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message || 'Invalid social link.' },
            { status: 400 }
          );
        }
      }

      await updateDbState((state) => {
        if (action === 'create' && item) {
          const safeUrl = sanitizeSafeUrl(String(item.url || ''), {
            allowRelative: false,
            allowMailto: true,
            fallback: '',
          });
          if (!safeUrl) return;
          state.socialLinks.push({
            id: cuid(),
            platform: String(item.platform || '').trim().slice(0, 80),
            url: safeUrl.slice(0, 512),
            icon: String(item.icon || 'globe').trim().slice(0, 64),
            position: Number(item.position || state.socialLinks.length + 1),
            isVisible: item.isVisible !== false,
          });
        } else if (action === 'update' && item) {
          const target = state.socialLinks.find((s) => s.id === item.id);
          if (target) {
            if (typeof item.platform === 'string' && item.platform.trim()) {
              target.platform = item.platform.trim().slice(0, 80);
            }
            if (typeof item.url === 'string') {
              const safeUrl = sanitizeSafeUrl(item.url, {
                allowRelative: false,
                allowMailto: true,
                fallback: '',
              });
              if (safeUrl) target.url = safeUrl.slice(0, 512);
            }
            if (typeof item.icon === 'string') target.icon = item.icon.trim().slice(0, 64);
            if (typeof item.position === 'number') target.position = item.position;
            if (typeof item.isVisible === 'boolean') target.isVisible = item.isVisible;
          }
        } else if (action === 'delete' && item?.id) {
          state.socialLinks = state.socialLinks.filter((s) => s.id !== item.id);
        }
        appendAuditRecord(state, {
          adminId: admin.id,
          action: 'SOCIAL_LINKS_UPDATED',
          entityType: 'SocialLink',
          entityId: item?.id || '',
          metadata: { action },
        });
      });
    } else if (group === 'pages') {
      const { action, page } = body;
      if (action === 'create' && page) {
        const parsed = pageSchema.safeParse({
          ...page,
          slug: page.slug || slugify(page.title),
        });
        if (!parsed.success) {
          return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message || 'Invalid page fields.' },
            { status: 400 }
          );
        }
      }
      await updateDbState((state) => {
        if (action === 'create' && page) {
          state.pages.push({
            id: cuid(),
            title: String(page.title || '').trim().slice(0, 200),
            slug: slugify(page.slug || page.title),
            content: String(page.content || '').slice(0, 50000),
            metaTitle: String(page.metaTitle || '').slice(0, 200),
            metaDescription: String(page.metaDescription || '').slice(0, 500),
            isPublished: page.isPublished !== false,
            createdAt: now,
            updatedAt: now,
          });
        } else if (action === 'update' && page) {
          const target = state.pages.find((p) => p.id === page.id);
          if (target) {
            if (typeof page.title === 'string' && page.title.trim()) {
              target.title = page.title.trim().slice(0, 200);
            }
            if (typeof page.slug === 'string' && page.slug.trim()) {
              target.slug = slugify(page.slug);
            }
            if (typeof page.content === 'string') target.content = page.content.slice(0, 50000);
            if (typeof page.metaTitle === 'string') target.metaTitle = page.metaTitle.trim().slice(0, 200);
            if (typeof page.metaDescription === 'string') {
              target.metaDescription = page.metaDescription.trim().slice(0, 500);
            }
            if (typeof page.isPublished === 'boolean') target.isPublished = page.isPublished;
            target.updatedAt = now;
          }
        } else if (action === 'delete' && page?.id) {
          state.pages = state.pages.filter((p) => p.id !== page.id);
        }
        appendAuditRecord(state, {
          adminId: admin.id,
          action: 'CMS_PAGE_UPDATED',
          entityType: 'Page',
          entityId: page?.id || '',
          metadata: { action, slug: page?.slug },
        });
      });
    } else if (group === 'gallery') {
      const { action, item } = body;
      if (action === 'create' && item) {
        const parsed = gallerySchema.safeParse(item);
        if (!parsed.success) {
          return NextResponse.json(
            { ok: false, error: parsed.error.issues[0]?.message || 'Invalid gallery item.' },
            { status: 400 }
          );
        }
      }
      await updateDbState((state) => {
        if (action === 'create' && item) {
          state.gallery.push({
            id: cuid(),
            title: String(item.title || '').trim().slice(0, 200),
            imageUrl: sanitizeSafeUrl(String(item.imageUrl || ''), {
              allowRelative: true,
              fallback: '',
            }).slice(0, 1024),
            imageFileId: String(item.imageFileId || '').trim().slice(0, 256),
            description: String(item.description || '').trim().slice(0, 1000),
            position: Number(item.position || state.gallery.length + 1),
            isPublished: item.isPublished !== false,
            createdAt: now,
          });
        } else if (action === 'update' && item) {
          const target = state.gallery.find((g) => g.id === item.id);
          if (target) {
            if (typeof item.title === 'string' && item.title.trim()) {
              target.title = item.title.trim().slice(0, 200);
            }
            if (typeof item.imageUrl === 'string') {
              target.imageUrl = sanitizeSafeUrl(item.imageUrl, {
                allowRelative: true,
                fallback: '',
              }).slice(0, 1024);
            }
            if (typeof item.imageFileId === 'string') {
              const nextFileId = item.imageFileId.trim().slice(0, 256);
              if (target.imageFileId && target.imageFileId !== nextFileId) {
                oldDriveFileIdsToDelete.push(target.imageFileId);
              }
              target.imageFileId = nextFileId;
            }
            if (typeof item.description === 'string') {
              target.description = item.description.trim().slice(0, 1000);
            }
            if (typeof item.isPublished === 'boolean') target.isPublished = item.isPublished;
          }
        } else if (action === 'delete' && item?.id) {
          const removedItem = state.gallery.find((g) => g.id === item.id);
          if (removedItem?.imageFileId) {
            oldDriveFileIdsToDelete.push(removedItem.imageFileId);
          }
          state.gallery = state.gallery.filter((g) => g.id !== item.id);
        }
        appendAuditRecord(state, {
          adminId: admin.id,
          action: 'GALLERY_UPDATED',
          entityType: 'Gallery',
          entityId: item?.id || '',
          metadata: { action },
        });
      });
    } else if (group === 'seoSettings') {
      const { item } = body;
      if (item && item.page) {
        await updateDbState((state) => {
          const existing = state.seoSettings.find((s) => s.page === item.page);
          const nextOgFileId = String(item.ogImageFileId || '').trim().slice(0, 256);
          const safeCanonical = sanitizeSafeUrl(String(item.canonicalUrl || ''), {
            allowRelative: false,
            fallback: '',
          });
          const safeOgImage = sanitizeSafeUrl(String(item.ogImage || ''), {
            allowRelative: true,
            fallback: '',
          });
          if (existing) {
            if (existing.ogImageFileId && existing.ogImageFileId !== nextOgFileId) {
              oldDriveFileIdsToDelete.push(existing.ogImageFileId);
            }
            existing.metaTitle = String(item.metaTitle || '').trim().slice(0, 200);
            existing.metaDescription = String(item.metaDescription || '').trim().slice(0, 500);
            existing.canonicalUrl = safeCanonical;
            existing.ogImage = safeOgImage;
            existing.ogImageFileId = nextOgFileId;
            existing.updatedAt = now;
          } else {
            state.seoSettings.push({
              id: cuid(),
              page: String(item.page).trim().slice(0, 64),
              metaTitle: String(item.metaTitle || '').trim().slice(0, 200),
              metaDescription: String(item.metaDescription || '').trim().slice(0, 500),
              canonicalUrl: safeCanonical,
              ogImage: safeOgImage,
              ogImageFileId: nextOgFileId,
              updatedAt: now,
            });
          }
          appendAuditRecord(state, {
            adminId: admin.id,
            action: 'SEO_SETTINGS_UPDATED',
            entityType: 'SEOSetting',
            entityId: item.page,
          });
        });
      }
    } else {
      return NextResponse.json({ ok: false, error: 'Unsupported settings group.' }, { status: 400 });
    }

    for (const fileId of oldDriveFileIdsToDelete) {
      await deleteFileFromGoogleDrive(fileId);
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('CMS settings update error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to update CMS settings.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState, updateDbState, logAuditEvent, cuid } from '@/lib/db.js';
import { slugify } from '@/lib/validation.js';

export async function GET() {
  const db = await getDbState();
  const settingsMap = {};
  for (const s of db.websiteSettings || []) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({
    ok: true,
    settings: settingsMap,
    websiteSettings: db.websiteSettings || [],
    navigationItems: db.navigationItems || [],
    socialLinks: db.socialLinks || [],
    pages: db.pages || [],
    gallery: db.gallery || [],
    seoSettings: db.seoSettings || [],
    auditLogs: (db.auditLogs || []).slice(0, 100),
  });
}

export async function PUT(request) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { group } = body;
    const now = new Date().toISOString();

    if (group === 'websiteSettings' && body.values && typeof body.values === 'object') {
      await updateDbState((state) => {
        for (const [key, val] of Object.entries(body.values)) {
          const safeVal = String(val ?? '').slice(0, 5000);
          const existing = state.websiteSettings.find((s) => s.key === key);
          if (existing) {
            existing.value = safeVal;
            existing.updatedAt = now;
          } else {
            state.websiteSettings.push({
              id: cuid(),
              key,
              value: safeVal,
              type: key.toLowerCase().includes('color') ? 'color' : 'string',
              updatedAt: now,
            });
          }
        }
      });

      await logAuditEvent({
        adminId: admin.id,
        action: 'WEBSITE_SETTINGS_UPDATED',
        entityType: 'WebsiteSetting',
        entityId: 'global',
        metadata: { keys: Object.keys(body.values) },
      });
    } else if (group === 'navigationItems') {
      const { action, item, items } = body;
      await updateDbState((state) => {
        if (action === 'create' && item) {
          state.navigationItems.push({
            id: cuid(),
            label: String(item.label || '').trim().slice(0, 80),
            url: String(item.url || '/').trim().slice(0, 256),
            location: item.location === 'footer' ? 'footer' : 'header',
            position: Number(item.position || state.navigationItems.length + 1),
            isVisible: item.isVisible !== false,
            parentId: null,
          });
        } else if (action === 'update' && item) {
          const target = state.navigationItems.find((n) => n.id === item.id);
          if (target) {
            if (typeof item.label === 'string') target.label = item.label.trim().slice(0, 80);
            if (typeof item.url === 'string') target.url = item.url.trim().slice(0, 256);
            if (typeof item.location === 'string') target.location = item.location;
            if (typeof item.position === 'number') target.position = item.position;
            if (typeof item.isVisible === 'boolean') target.isVisible = item.isVisible;
          }
        } else if (action === 'delete' && item?.id) {
          state.navigationItems = state.navigationItems.filter((n) => n.id !== item.id);
        } else if (action === 'replaceAll' && Array.isArray(items)) {
          state.navigationItems = items;
        }
      });

      await logAuditEvent({
        adminId: admin.id,
        action: 'NAVIGATION_UPDATED',
        entityType: 'NavigationItem',
        entityId: item?.id || 'bulk',
        metadata: { action },
      });
    } else if (group === 'socialLinks') {
      const { action, item } = body;
      await updateDbState((state) => {
        if (action === 'create' && item) {
          state.socialLinks.push({
            id: cuid(),
            platform: String(item.platform || '').trim().slice(0, 80),
            url: String(item.url || '').trim().slice(0, 512),
            icon: String(item.icon || 'globe').trim().slice(0, 64),
            position: Number(item.position || state.socialLinks.length + 1),
            isVisible: item.isVisible !== false,
          });
        } else if (action === 'update' && item) {
          const target = state.socialLinks.find((s) => s.id === item.id);
          if (target) {
            if (typeof item.platform === 'string') target.platform = item.platform.trim();
            if (typeof item.url === 'string') target.url = item.url.trim();
            if (typeof item.icon === 'string') target.icon = item.icon.trim();
            if (typeof item.position === 'number') target.position = item.position;
            if (typeof item.isVisible === 'boolean') target.isVisible = item.isVisible;
          }
        } else if (action === 'delete' && item?.id) {
          state.socialLinks = state.socialLinks.filter((s) => s.id !== item.id);
        }
      });

      await logAuditEvent({
        adminId: admin.id,
        action: 'SOCIAL_LINKS_UPDATED',
        entityType: 'SocialLink',
        entityId: item?.id || '',
        metadata: { action },
      });
    } else if (group === 'pages') {
      const { action, page } = body;
      await updateDbState((state) => {
        if (action === 'create' && page) {
          state.pages.push({
            id: cuid(),
            title: String(page.title || '').trim(),
            slug: slugify(page.slug || page.title),
            content: String(page.content || ''),
            metaTitle: String(page.metaTitle || ''),
            metaDescription: String(page.metaDescription || ''),
            isPublished: page.isPublished !== false,
            createdAt: now,
            updatedAt: now,
          });
        } else if (action === 'update' && page) {
          const target = state.pages.find((p) => p.id === page.id);
          if (target) {
            if (typeof page.title === 'string') target.title = page.title.trim();
            if (typeof page.slug === 'string') target.slug = slugify(page.slug);
            if (typeof page.content === 'string') target.content = page.content;
            if (typeof page.metaTitle === 'string') target.metaTitle = page.metaTitle.trim();
            if (typeof page.metaDescription === 'string') target.metaDescription = page.metaDescription.trim();
            if (typeof page.isPublished === 'boolean') target.isPublished = page.isPublished;
            target.updatedAt = now;
          }
        } else if (action === 'delete' && page?.id) {
          state.pages = state.pages.filter((p) => p.id !== page.id);
        }
      });

      await logAuditEvent({
        adminId: admin.id,
        action: 'CMS_PAGE_UPDATED',
        entityType: 'Page',
        entityId: page?.id || '',
        metadata: { action, slug: page?.slug },
      });
    } else if (group === 'gallery') {
      const { action, item } = body;
      await updateDbState((state) => {
        if (action === 'create' && item) {
          state.gallery.push({
            id: cuid(),
            title: String(item.title || '').trim(),
            imageUrl: String(item.imageUrl || '').trim(),
            imageFileId: String(item.imageFileId || '').trim(),
            description: String(item.description || '').trim(),
            position: Number(item.position || state.gallery.length + 1),
            isPublished: item.isPublished !== false,
            createdAt: now,
          });
        } else if (action === 'update' && item) {
          const target = state.gallery.find((g) => g.id === item.id);
          if (target) {
            if (typeof item.title === 'string') target.title = item.title.trim();
            if (typeof item.imageUrl === 'string') target.imageUrl = item.imageUrl.trim();
            if (typeof item.imageFileId === 'string') target.imageFileId = item.imageFileId.trim();
            if (typeof item.description === 'string') target.description = item.description.trim();
            if (typeof item.isPublished === 'boolean') target.isPublished = item.isPublished;
          }
        } else if (action === 'delete' && item?.id) {
          state.gallery = state.gallery.filter((g) => g.id !== item.id);
        }
      });

      await logAuditEvent({
        adminId: admin.id,
        action: 'GALLERY_UPDATED',
        entityType: 'Gallery',
        entityId: item?.id || '',
        metadata: { action },
      });
    } else if (group === 'seoSettings') {
      const { item } = body;
      if (item && item.page) {
        await updateDbState((state) => {
          const existing = state.seoSettings.find((s) => s.page === item.page);
          if (existing) {
            existing.metaTitle = String(item.metaTitle || '').trim();
            existing.metaDescription = String(item.metaDescription || '').trim();
            existing.canonicalUrl = String(item.canonicalUrl || '').trim();
            existing.ogImage = String(item.ogImage || '').trim();
            existing.ogImageFileId = String(item.ogImageFileId || '').trim();
            existing.updatedAt = now;
          } else {
            state.seoSettings.push({
              id: cuid(),
              page: String(item.page).trim(),
              metaTitle: String(item.metaTitle || '').trim(),
              metaDescription: String(item.metaDescription || '').trim(),
              canonicalUrl: String(item.canonicalUrl || '').trim(),
              ogImage: String(item.ogImage || '').trim(),
              ogImageFileId: String(item.ogImageFileId || '').trim(),
              updatedAt: now,
            });
          }
        });

        await logAuditEvent({
          adminId: admin.id,
          action: 'SEO_SETTINGS_UPDATED',
          entityType: 'SEOSetting',
          entityId: item.page,
        });
      }
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('CMS settings update error:', err);
    return NextResponse.json({ ok: false, error: 'Failed to update CMS settings.' }, { status: 500 });
  }
}

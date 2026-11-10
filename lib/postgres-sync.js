import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { getEnvConfig } from './env.js';

const { Pool } = pg;

let pgPool = null;
let schemaEnsured = false;

export function isRemotePostgresConfigured() {
  const { databaseUrl } = getEnvConfig();
  if (!databaseUrl) return false;
  if (databaseUrl.includes('postgres:password@localhost:5432')) return false;
  return databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
}

export function getPgPool() {
  if (!isRemotePostgresConfigured()) return null;
  if (!pgPool) {
    const { databaseUrl } = getEnvConfig();
    const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
    });
  }
  return pgPool;
}

export async function ensurePostgresSchema() {
  const pool = getPgPool();
  if (!pool) return false;
  if (schemaEnsured) return true;

  const migrationPath = path.resolve(
    process.cwd(),
    'prisma/migrations/0001_initial_schema/migration.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();
  try {
    await client.query(sql);
    schemaEnsured = true;
    return true;
  } finally {
    client.release();
  }
}

function toIsoOrNull(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export async function loadStateFromPostgres() {
  const pool = getPgPool();
  if (!pool) return null;

  await ensurePostgresSchema();
  const adminsRes = await pool.query('SELECT * FROM "admins" ORDER BY "createdAt" ASC');
  if (adminsRes.rows.length === 0) {
    return null;
  }

  const [
    artistsRes,
    albumsRes,
    musicRes,
    googleRes,
    settingsRes,
    navRes,
    socialRes,
    sectionsRes,
    pagesRes,
    galleryRes,
    messagesRes,
    seoRes,
    auditRes,
  ] = await Promise.all([
    pool.query('SELECT * FROM "artists" ORDER BY "createdAt" ASC'),
    pool.query('SELECT * FROM "albums" ORDER BY "createdAt" DESC'),
    pool.query('SELECT * FROM "music" ORDER BY "createdAt" DESC'),
    pool.query('SELECT * FROM "google_integrations"'),
    pool.query('SELECT * FROM "website_settings"'),
    pool.query('SELECT * FROM "navigation_items" ORDER BY "position" ASC'),
    pool.query('SELECT * FROM "social_links" ORDER BY "position" ASC'),
    pool.query('SELECT * FROM "sections" ORDER BY "position" ASC'),
    pool.query('SELECT * FROM "pages" ORDER BY "createdAt" ASC'),
    pool.query('SELECT * FROM "gallery" ORDER BY "position" ASC'),
    pool.query('SELECT * FROM "contact_messages" ORDER BY "createdAt" DESC'),
    pool.query('SELECT * FROM "seo_settings"'),
    pool.query('SELECT * FROM "audit_logs" ORDER BY "createdAt" DESC LIMIT 250'),
  ]);

    return {
      schemaVersion: 2,
      migratedAt: new Date().toISOString(),
      admins: adminsRes.rows.map((r) => ({
        ...r,
        lastLoginAt: toIsoOrNull(r.lastLoginAt),
        createdAt: toIsoOrNull(r.createdAt),
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      artists: artistsRes.rows.map((r) => ({
        ...r,
        profileImageFileId: r.profileImageFileId || '',
        coverImageFileId: r.coverImageFileId || '',
        createdAt: toIsoOrNull(r.createdAt),
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      albums: albumsRes.rows.map((r) => ({
        ...r,
        coverImageFileId: r.coverImageFileId || '',
        releaseDate: toIsoOrNull(r.releaseDate),
        createdAt: toIsoOrNull(r.createdAt),
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      music: musicRes.rows.map((r) => ({
        ...r,
        thumbnailFileId: r.thumbnailFileId || '',
        createdAt: toIsoOrNull(r.createdAt),
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      googleIntegrations: googleRes.rows.map((r) => ({
        ...r,
        musicFolderId: r.musicFolderId || r.uploadFolderId || '',
        musicFolderName: r.musicFolderName || 'Musics',
        imageFolderId: r.imageFolderId || '',
        imageFolderName: r.imageFolderName || 'Images',
        lastUploadAt: toIsoOrNull(r.lastUploadAt),
        connectedAt: toIsoOrNull(r.connectedAt),
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      websiteSettings: settingsRes.rows.map((r) => ({
        ...r,
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      navigationItems: navRes.rows,
      socialLinks: socialRes.rows,
      sections: sectionsRes.rows.map((r) => ({
        ...r,
        createdAt: toIsoOrNull(r.createdAt),
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      pages: pagesRes.rows.map((r) => ({
        ...r,
        createdAt: toIsoOrNull(r.createdAt),
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      gallery: galleryRes.rows.map((r) => ({
        ...r,
        imageFileId: r.imageFileId || '',
        createdAt: toIsoOrNull(r.createdAt),
      })),
      contactMessages: messagesRes.rows.map((r) => ({
        ...r,
        createdAt: toIsoOrNull(r.createdAt),
      })),
      seoSettings: seoRes.rows.map((r) => ({
        ...r,
        ogImageFileId: r.ogImageFileId || '',
        updatedAt: toIsoOrNull(r.updatedAt),
      })),
      auditLogs: auditRes.rows.map((r) => ({
        ...r,
        createdAt: toIsoOrNull(r.createdAt),
      })),
    };
}

export async function syncStateToPostgres(state) {
  const pool = getPgPool();
  if (!pool || !state) return false;

  await ensurePostgresSchema();
  const client = await pool.connect();
  const now = new Date().toISOString();

  try {
    await client.query('BEGIN');

    // 1. Admins
    for (const a of state.admins || []) {
      await client.query(
        `INSERT INTO "admins" ("id", "name", "username", "email", "passwordHash", "role", "isActive", "mustChangePassword", "lastLoginAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name",
           "username" = EXCLUDED."username",
           "email" = EXCLUDED."email",
           "passwordHash" = EXCLUDED."passwordHash",
           "role" = EXCLUDED."role",
           "isActive" = EXCLUDED."isActive",
           "mustChangePassword" = EXCLUDED."mustChangePassword",
           "lastLoginAt" = EXCLUDED."lastLoginAt",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          a.id,
          a.name || 'Administrator',
          a.username,
          a.email || null,
          a.passwordHash,
          a.role || 'SUPER_ADMIN',
          a.isActive !== false,
          Boolean(a.mustChangePassword),
          a.lastLoginAt || null,
          a.createdAt || now,
          a.updatedAt || now,
        ]
      );
    }

    // 2. Artists
    for (const ar of state.artists || []) {
      await client.query(
        `INSERT INTO "artists" ("id", "name", "slug", "biography", "shortBiography", "profileImage", "profileImageFileId", "coverImage", "coverImageFileId", "location", "website", "socialLinks", "achievements", "careerInfo", "musicalBg", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16, $17)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name",
           "slug" = EXCLUDED."slug",
           "biography" = EXCLUDED."biography",
           "shortBiography" = EXCLUDED."shortBiography",
           "profileImage" = EXCLUDED."profileImage",
           "profileImageFileId" = EXCLUDED."profileImageFileId",
           "coverImage" = EXCLUDED."coverImage",
           "coverImageFileId" = EXCLUDED."coverImageFileId",
           "location" = EXCLUDED."location",
           "website" = EXCLUDED."website",
           "socialLinks" = EXCLUDED."socialLinks",
           "achievements" = EXCLUDED."achievements",
           "careerInfo" = EXCLUDED."careerInfo",
           "musicalBg" = EXCLUDED."musicalBg",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          ar.id,
          ar.name,
          ar.slug,
          ar.biography || '',
          ar.shortBiography || '',
          ar.profileImage || '',
          ar.profileImageFileId || '',
          ar.coverImage || '',
          ar.coverImageFileId || '',
          ar.location || '',
          ar.website || '',
          JSON.stringify(ar.socialLinks || []),
          JSON.stringify(ar.achievements || []),
          ar.careerInfo || '',
          ar.musicalBg || '',
          ar.createdAt || now,
          ar.updatedAt || now,
        ]
      );
    }

    // 3. Albums
    const albumIds = (state.albums || []).map((al) => al.id);
    if (albumIds.length > 0) {
      await client.query('DELETE FROM "albums" WHERE NOT ("id" = ANY($1::text[]))', [albumIds]);
    } else {
      await client.query('DELETE FROM "albums"');
    }
    for (const al of state.albums || []) {
      await client.query(
        `INSERT INTO "albums" ("id", "title", "slug", "description", "coverImage", "coverImageFileId", "releaseDate", "artistId", "isPublished", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("id") DO UPDATE SET
           "title" = EXCLUDED."title",
           "slug" = EXCLUDED."slug",
           "description" = EXCLUDED."description",
           "coverImage" = EXCLUDED."coverImage",
           "coverImageFileId" = EXCLUDED."coverImageFileId",
           "releaseDate" = EXCLUDED."releaseDate",
           "artistId" = EXCLUDED."artistId",
           "isPublished" = EXCLUDED."isPublished",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          al.id,
          al.title,
          al.slug,
          al.description || '',
          al.coverImage || '',
          al.coverImageFileId || '',
          al.releaseDate || null,
          al.artistId || 'masud-hauqe',
          Boolean(al.isPublished),
          al.createdAt || now,
          al.updatedAt || now,
        ]
      );
    }

    // 4. Music
    const musicIds = (state.music || []).map((m) => m.id);
    if (musicIds.length > 0) {
      await client.query('DELETE FROM "music" WHERE NOT ("id" = ANY($1::text[]))', [musicIds]);
    } else {
      await client.query('DELETE FROM "music"');
    }
    for (const m of state.music || []) {
      await client.query(
        `INSERT INTO "music" ("id", "title", "slug", "artistId", "albumId", "description", "thumbnail", "thumbnailFileId", "youtubeUrl", "youtubeVideoId", "duration", "audioProvider", "audioFileId", "audioFileName", "audioMimeType", "audioFileSize", "uploadStatus", "isPublished", "downloadEnabled", "playCount", "downloadCount", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         ON CONFLICT ("id") DO UPDATE SET
           "title" = EXCLUDED."title",
           "slug" = EXCLUDED."slug",
           "artistId" = EXCLUDED."artistId",
           "albumId" = EXCLUDED."albumId",
           "description" = EXCLUDED."description",
           "thumbnail" = EXCLUDED."thumbnail",
           "thumbnailFileId" = EXCLUDED."thumbnailFileId",
           "youtubeUrl" = EXCLUDED."youtubeUrl",
           "youtubeVideoId" = EXCLUDED."youtubeVideoId",
           "duration" = EXCLUDED."duration",
           "audioProvider" = EXCLUDED."audioProvider",
           "audioFileId" = EXCLUDED."audioFileId",
           "audioFileName" = EXCLUDED."audioFileName",
           "audioMimeType" = EXCLUDED."audioMimeType",
           "audioFileSize" = EXCLUDED."audioFileSize",
           "uploadStatus" = EXCLUDED."uploadStatus",
           "isPublished" = EXCLUDED."isPublished",
           "downloadEnabled" = EXCLUDED."downloadEnabled",
           "playCount" = EXCLUDED."playCount",
           "downloadCount" = EXCLUDED."downloadCount",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          m.id,
          m.title,
          m.slug,
          m.artistId || 'masud-hauqe',
          m.albumId || null,
          m.description || '',
          m.thumbnail || '',
          m.thumbnailFileId || '',
          m.youtubeUrl || '',
          m.youtubeVideoId || '',
          m.duration || '0:00',
          m.audioProvider || 'google_drive',
          m.audioFileId || '',
          m.audioFileName || '',
          m.audioMimeType || 'audio/mpeg',
          Number(m.audioFileSize || 0),
          m.uploadStatus || 'completed',
          Boolean(m.isPublished),
          m.downloadEnabled !== false,
          Number(m.playCount || 0),
          Number(m.downloadCount || 0),
          m.createdAt || now,
          m.updatedAt || now,
        ]
      );
    }

    // 5. Google Integrations
    for (const gi of state.googleIntegrations || []) {
      await client.query(
        `INSERT INTO "google_integrations" ("id", "provider", "accountEmail", "encryptedRefreshToken", "uploadFolderId", "uploadFolderName", "musicFolderId", "musicFolderName", "imageFolderId", "imageFolderName", "connected", "lastUploadAt", "lastUploadStatus", "connectedAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT ("provider") DO UPDATE SET
           "accountEmail" = EXCLUDED."accountEmail",
           "encryptedRefreshToken" = EXCLUDED."encryptedRefreshToken",
           "uploadFolderId" = EXCLUDED."uploadFolderId",
           "uploadFolderName" = EXCLUDED."uploadFolderName",
           "musicFolderId" = EXCLUDED."musicFolderId",
           "musicFolderName" = EXCLUDED."musicFolderName",
           "imageFolderId" = EXCLUDED."imageFolderId",
           "imageFolderName" = EXCLUDED."imageFolderName",
           "connected" = EXCLUDED."connected",
           "lastUploadAt" = EXCLUDED."lastUploadAt",
           "lastUploadStatus" = EXCLUDED."lastUploadStatus",
           "connectedAt" = EXCLUDED."connectedAt",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          gi.id || 'gdrive-primary',
          gi.provider || 'google_drive',
          gi.accountEmail || '',
          gi.encryptedRefreshToken || '',
          gi.musicFolderId || gi.uploadFolderId || '',
          gi.musicFolderName || 'Musics',
          gi.musicFolderId || gi.uploadFolderId || '',
          gi.musicFolderName || 'Musics',
          gi.imageFolderId || '',
          gi.imageFolderName || 'Images',
          Boolean(gi.connected),
          gi.lastUploadAt || null,
          gi.lastUploadStatus || 'idle',
          gi.connectedAt || null,
          gi.updatedAt || now,
        ]
      );
    }

    // 6. Website Settings
    for (const ws of state.websiteSettings || []) {
      await client.query(
        `INSERT INTO "website_settings" ("id", "key", "value", "type", "updatedAt")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("key") DO UPDATE SET
           "value" = EXCLUDED."value",
           "type" = EXCLUDED."type",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [ws.id, ws.key, String(ws.value ?? ''), ws.type || 'string', ws.updatedAt || now]
      );
    }

    // 7. Sections
    const secIds = (state.sections || []).map((s) => s.id);
    if (secIds.length > 0) {
      await client.query('DELETE FROM "sections" WHERE NOT ("id" = ANY($1::text[]))', [secIds]);
    } else {
      await client.query('DELETE FROM "sections"');
    }
    for (const s of state.sections || []) {
      await client.query(
        `INSERT INTO "sections" ("id", "name", "type", "content", "settings", "position", "isVisible", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name",
           "type" = EXCLUDED."type",
           "content" = EXCLUDED."content",
           "settings" = EXCLUDED."settings",
           "position" = EXCLUDED."position",
           "isVisible" = EXCLUDED."isVisible",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          s.id,
          s.name,
          s.type,
          JSON.stringify(s.content || {}),
          JSON.stringify(s.settings || {}),
          Number(s.position || 0),
          s.isVisible !== false,
          s.createdAt || now,
          s.updatedAt || now,
        ]
      );
    }

    // 8. Navigation Items
    const navIds = (state.navigationItems || []).map((n) => n.id);
    if (navIds.length > 0) {
      await client.query('DELETE FROM "navigation_items" WHERE NOT ("id" = ANY($1::text[]))', [navIds]);
    } else {
      await client.query('DELETE FROM "navigation_items"');
    }
    for (const n of state.navigationItems || []) {
      await client.query(
        `INSERT INTO "navigation_items" ("id", "label", "url", "location", "position", "isVisible", "parentId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("id") DO UPDATE SET
           "label" = EXCLUDED."label",
           "url" = EXCLUDED."url",
           "location" = EXCLUDED."location",
           "position" = EXCLUDED."position",
           "isVisible" = EXCLUDED."isVisible",
           "parentId" = EXCLUDED."parentId"`,
        [
          n.id,
          n.label,
          n.url,
          n.location || 'header',
          Number(n.position || 0),
          n.isVisible !== false,
          n.parentId || null,
        ]
      );
    }

    // 9. Social Links
    const socIds = (state.socialLinks || []).map((s) => s.id);
    if (socIds.length > 0) {
      await client.query('DELETE FROM "social_links" WHERE NOT ("id" = ANY($1::text[]))', [socIds]);
    } else {
      await client.query('DELETE FROM "social_links"');
    }
    for (const s of state.socialLinks || []) {
      await client.query(
        `INSERT INTO "social_links" ("id", "platform", "url", "icon", "position", "isVisible")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("id") DO UPDATE SET
           "platform" = EXCLUDED."platform",
           "url" = EXCLUDED."url",
           "icon" = EXCLUDED."icon",
           "position" = EXCLUDED."position",
           "isVisible" = EXCLUDED."isVisible"`,
        [s.id, s.platform, s.url, s.icon || 'globe', Number(s.position || 0), s.isVisible !== false]
      );
    }

    // 10. Pages
    const pageIds = (state.pages || []).map((p) => p.id);
    if (pageIds.length > 0) {
      await client.query('DELETE FROM "pages" WHERE NOT ("id" = ANY($1::text[]))', [pageIds]);
    } else {
      await client.query('DELETE FROM "pages"');
    }
    for (const p of state.pages || []) {
      await client.query(
        `INSERT INTO "pages" ("id", "title", "slug", "content", "metaTitle", "metaDescription", "isPublished", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT ("id") DO UPDATE SET
           "title" = EXCLUDED."title",
           "slug" = EXCLUDED."slug",
           "content" = EXCLUDED."content",
           "metaTitle" = EXCLUDED."metaTitle",
           "metaDescription" = EXCLUDED."metaDescription",
           "isPublished" = EXCLUDED."isPublished",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          p.id,
          p.title,
          p.slug,
          p.content || '',
          p.metaTitle || '',
          p.metaDescription || '',
          p.isPublished !== false,
          p.createdAt || now,
          p.updatedAt || now,
        ]
      );
    }

    // 11. Gallery
    const galIds = (state.gallery || []).map((g) => g.id);
    if (galIds.length > 0) {
      await client.query('DELETE FROM "gallery" WHERE NOT ("id" = ANY($1::text[]))', [galIds]);
    } else {
      await client.query('DELETE FROM "gallery"');
    }
    for (const g of state.gallery || []) {
      await client.query(
        `INSERT INTO "gallery" ("id", "title", "imageUrl", "imageFileId", "description", "position", "isPublished", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("id") DO UPDATE SET
           "title" = EXCLUDED."title",
           "imageUrl" = EXCLUDED."imageUrl",
           "imageFileId" = EXCLUDED."imageFileId",
           "description" = EXCLUDED."description",
           "position" = EXCLUDED."position",
           "isPublished" = EXCLUDED."isPublished"`,
        [
          g.id,
          g.title,
          g.imageUrl,
          g.imageFileId || '',
          g.description || '',
          Number(g.position || 0),
          g.isPublished !== false,
          g.createdAt || now,
        ]
      );
    }

    // 12. Contact Messages
    const msgIds = (state.contactMessages || []).map((cm) => cm.id);
    if (msgIds.length > 0) {
      await client.query('DELETE FROM "contact_messages" WHERE NOT ("id" = ANY($1::text[]))', [msgIds]);
    } else {
      await client.query('DELETE FROM "contact_messages"');
    }
    for (const cm of state.contactMessages || []) {
      await client.query(
        `INSERT INTO "contact_messages" ("id", "name", "email", "subject", "message", "isRead", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("id") DO UPDATE SET
           "isRead" = EXCLUDED."isRead"`,
        [
          cm.id,
          cm.name,
          cm.email,
          cm.subject || '',
          cm.message || '',
          Boolean(cm.isRead),
          cm.createdAt || now,
        ]
      );
    }

    // 13. SEO Settings
    for (const seo of state.seoSettings || []) {
      await client.query(
        `INSERT INTO "seo_settings" ("id", "page", "metaTitle", "metaDescription", "canonicalUrl", "ogImage", "ogImageFileId", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT ("page") DO UPDATE SET
           "metaTitle" = EXCLUDED."metaTitle",
           "metaDescription" = EXCLUDED."metaDescription",
           "canonicalUrl" = EXCLUDED."canonicalUrl",
           "ogImage" = EXCLUDED."ogImage",
           "ogImageFileId" = EXCLUDED."ogImageFileId",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [
          seo.id,
          seo.page,
          seo.metaTitle || '',
          seo.metaDescription || '',
          seo.canonicalUrl || '',
          seo.ogImage || '',
          seo.ogImageFileId || '',
          seo.updatedAt || now,
        ]
      );
    }

    // 14. Audit Logs
    for (const log of (state.auditLogs || []).slice(0, 100)) {
      const validAdminId =
        log.adminId && (state.admins || []).some((a) => a.id === log.adminId) ? log.adminId : null;
      await client.query(
        `INSERT INTO "audit_logs" ("id", "adminId", "action", "entityType", "entityId", "metadata", "ipAddress", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
         ON CONFLICT ("id") DO NOTHING`,
        [
          log.id,
          validAdminId,
          log.action,
          log.entityType,
          log.entityId || '',
          JSON.stringify(log.metadata || {}),
          log.ipAddress || '127.0.0.1',
          log.createdAt || now,
        ]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PostgreSQL synchronization error:', err);
    throw err;
  } finally {
    client.release();
  }
}

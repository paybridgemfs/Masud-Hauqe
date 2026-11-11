-- Prisma Migration: 0001_initial_schema
-- Database: PostgreSQL

CREATE TABLE IF NOT EXISTS "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admins_username_key" ON "admins"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_key" ON "admins"("email");

CREATE TABLE IF NOT EXISTS "artists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "biography" TEXT NOT NULL DEFAULT '',
    "shortBiography" TEXT NOT NULL DEFAULT '',
    "profileImage" TEXT NOT NULL DEFAULT '',
    "profileImageFileId" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "coverImageFileId" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "careerInfo" TEXT NOT NULL DEFAULT '',
    "musicalBg" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "artists_slug_key" ON "artists"("slug");

CREATE TABLE IF NOT EXISTS "albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "coverImageFileId" TEXT NOT NULL DEFAULT '',
    "releaseDate" TIMESTAMP(3),
    "artistId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "albums_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "albums_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "albums_slug_key" ON "albums"("slug");
CREATE INDEX IF NOT EXISTS "albums_artistId_idx" ON "albums"("artistId");
CREATE INDEX IF NOT EXISTS "albums_isPublished_idx" ON "albums"("isPublished");

CREATE TABLE IF NOT EXISTS "music" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "thumbnail" TEXT NOT NULL DEFAULT '',
    "thumbnailFileId" TEXT NOT NULL DEFAULT '',
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "youtubeVideoId" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '0:00',
    "audioProvider" TEXT NOT NULL DEFAULT 'google_drive',
    "audioFileId" TEXT NOT NULL DEFAULT '',
    "audioFileName" TEXT NOT NULL DEFAULT '',
    "audioMimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "audioFileSize" INTEGER NOT NULL DEFAULT 0,
    "uploadStatus" TEXT NOT NULL DEFAULT 'pending',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "downloadEnabled" BOOLEAN NOT NULL DEFAULT true,
    "includeYoutubeVideo" BOOLEAN NOT NULL DEFAULT false,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "music_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "music_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "music_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "music_slug_key" ON "music"("slug");
CREATE INDEX IF NOT EXISTS "music_artistId_idx" ON "music"("artistId");
CREATE INDEX IF NOT EXISTS "music_albumId_idx" ON "music"("albumId");
CREATE INDEX IF NOT EXISTS "music_isPublished_idx" ON "music"("isPublished");

CREATE TABLE IF NOT EXISTS "google_integrations" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google_drive',
    "accountEmail" TEXT NOT NULL DEFAULT '',
    "encryptedRefreshToken" TEXT NOT NULL DEFAULT '',
    "uploadFolderId" TEXT NOT NULL DEFAULT '',
    "uploadFolderName" TEXT NOT NULL DEFAULT 'Musics',
    "musicFolderId" TEXT NOT NULL DEFAULT '',
    "musicFolderName" TEXT NOT NULL DEFAULT 'Musics',
    "imageFolderId" TEXT NOT NULL DEFAULT '',
    "imageFolderName" TEXT NOT NULL DEFAULT 'Images',
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "lastUploadAt" TIMESTAMP(3),
    "lastUploadStatus" TEXT NOT NULL DEFAULT 'idle',
    "connectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "google_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "google_integrations_provider_key" ON "google_integrations"("provider");

CREATE TABLE IF NOT EXISTS "website_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "website_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "website_settings_key_key" ON "website_settings"("key");

CREATE TABLE IF NOT EXISTS "pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pages_slug_key" ON "pages"("slug");

CREATE TABLE IF NOT EXISTS "sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "navigation_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'header',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "social_links" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'globe',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gallery" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageFileId" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gallery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "seo_settings" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "ogImage" TEXT NOT NULL DEFAULT '',
    "ogImageFileId" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seo_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seo_settings_page_key" ON "seo_settings"("page");

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Safe non-destructive schema upgrades for existing tables
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "profileImageFileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "artists" ADD COLUMN IF NOT EXISTS "coverImageFileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "coverImageFileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "thumbnailFileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "includeYoutubeVideo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gallery" ADD COLUMN IF NOT EXISTS "imageFileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "seo_settings" ADD COLUMN IF NOT EXISTS "ogImageFileId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "google_integrations" ADD COLUMN IF NOT EXISTS "musicFolderId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "google_integrations" ADD COLUMN IF NOT EXISTS "musicFolderName" TEXT NOT NULL DEFAULT 'Musics';
ALTER TABLE "google_integrations" ADD COLUMN IF NOT EXISTS "imageFolderId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "google_integrations" ADD COLUMN IF NOT EXISTS "imageFolderName" TEXT NOT NULL DEFAULT 'Images';

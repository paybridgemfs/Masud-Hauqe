# Masud Hauqe — Official Music Artist Website & Dynamic CMS Platform

A full-stack **Music Artist Website, Audio Streaming Platform, and Dynamic Content Management System (CMS)** engineered for recording artist **Masud Hauqe** (`mdsagormia179@gmail.com`).

---

## 1. Core Architecture & Stack

- **Framework**: Next.js 15+ (App Router) with React 19
- **Typography**: **Dosis** (`next/font/google`) applied across the public website, persistent audio player, and Admin CMS
- **Styling**: Tailwind CSS (`@import "tailwindcss";`) with Noir & Champagne Gold editorial design tokens (`#09090B`, `#111115`, `#C8A464`, `#F4F1EA`)
- **Audio Engine**: Persistent global bottom-docked audio player powered by `howler` (`Howl`), supporting continuous playback across route transitions, seek, volume, mute, shuffle, repeat, and queue drawer
- **Cloud Audio Storage & Streaming**:
  - **Google Drive API v3 (`googleapis`)**: OAuth 2.0 integration (`https://www.googleapis.com/auth/drive.file`), encrypted refresh token persistence (AES-256-GCM), automatic `anyone: reader` public permission provisioning, and byte-range streaming proxy (`/api/music/[id]/stream`)
  - **YouTube Data API v3**: Automatic metadata extraction (`fetchYouTubeMetadata`) for video title, description, thumbnail, publish date, and ISO 8601 duration parsing
- **Database & Persistence**:
  - Prisma relational schema (`prisma/schema.prisma`) & SQL migration (`prisma/migrations/0001_initial_schema/migration.sql`)
  - Firebase Firestore (`firebase.js` + `firestore.rules`) & ACID-safe relational state persistence (`lib/db.js`) with automatic schema bootstrap

---

## 2. Environment Variables (`.env`)

Copy `.env.example` to `.env` and configure the following variables:

```env
# Database & Session Security
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/masud_hauqe_music?schema=public"
SESSION_SECRET="replace-with-a-64-char-random-hex-secret"
ENCRYPTION_KEY="replace-with-a-32-byte-hex-or-base64-secret"

# Application Base URL
APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Google OAuth 2.0 (Google Drive MP3 Upload & Public Delivery)
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/google/callback"
GOOGLE_DRIVE_FOLDER_ID=""

# YouTube Data API v3 (Auto-fetch Song & Video Metadata)
YOUTUBE_API_KEY="your-youtube-data-api-v3-key"
```

---

## 3. Google Cloud Console Setup (Drive API & YouTube Data API v3)

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Drive API** and **YouTube Data API v3** under **APIs & Services > Library**.
3. Under **APIs & Services > Credentials**:
   - Create an **API Key** and set it as `YOUTUBE_API_KEY`.
   - Create an **OAuth 2.0 Client ID** (Web application) and add your callback URI:
     - `<APP_URL>/api/integrations/google/callback`
4. Sign in to `/admin/integrations/google-drive` to connect your Google Drive account or configure OAuth credentials directly from the Admin UI.
5. **Public Streaming Delivery**: When an MP3 is uploaded via `/admin/music/add`, the server validates the binary MP3 header (`ID3` or MPEG sync frame), uploads the file to Google Drive, applies `role: 'reader', type: 'anyone'` permission so public visitors can stream without logging in, and serves audio via `/api/music/[id]/stream`.

---

## 4. Installation, Database Setup & Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Seed initial system state (optional manual trigger; auto-bootstraps on first request)
node prisma/seed.js

# 3. Start the development server on port 3000
npm run dev

# 4. Run unit & security tests
npx tsx --test lib/core.test.ts firestore.rules.test.ts

# 5. Build for production
npm run build
```

---

## 5. Default Admin Bootstrap Credentials

On first startup, the database automatically initializes ONLY the required bootstrap administrator and the artist profile for **Masud Hauqe** (zero fake tracks or dummy content):

- **Login URL**: `/admin/login`
- **Default Username**: `admin`
- **Default Password**: `admin`

> **Security Note**: Upon first login with `admin` / `admin`, the `mustChangePassword` flag is active and prompts immediate password rotation at `/admin/settings`.

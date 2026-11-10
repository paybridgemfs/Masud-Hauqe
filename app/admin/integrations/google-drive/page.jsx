import React from 'react';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth.js';
import { getDbState } from '@/lib/db.js';
import { getEnvConfig } from '@/lib/env.js';
import AdminShell from '@/components/admin/AdminShell.jsx';
import GoogleDriveClient from '@/components/admin/GoogleDriveClient.jsx';

export const dynamic = 'force-dynamic';

export default async function GoogleDriveIntegrationPage({ searchParams }) {
  const { authorized, admin } = await requireAdminSession();
  if (!authorized) {
    redirect('/admin/login');
  }

  const sp = await searchParams;
  const db = await getDbState();
  const env = getEnvConfig();
  const integration = db.googleIntegrations?.[0] || {};

  return (
    <AdminShell
      admin={admin}
      title="Google Drive & YouTube Integrations"
      subtitle="Connect your Google Drive account for MP3 storage and verify YouTube Data API v3 metadata extraction"
    >
      <GoogleDriveClient
        initialIntegration={{
          connected: Boolean(integration.connected),
          accountEmail: integration.accountEmail || '',
          uploadFolderId: integration.uploadFolderId || '',
          uploadFolderName: integration.uploadFolderName || 'Root / Masud Hauqe Archive',
          connectedAt: integration.connectedAt || null,
          lastUploadAt: integration.lastUploadAt || null,
        }}
        envConfigured={env.google.isConfigured}
        redirectUri={env.google.redirectUri}
        scopes={env.google.scopes}
        youtubeConfigured={env.youtube.isConfigured}
        queryConnected={sp?.connected === '1'}
        queryError={sp?.error || ''}
      />
    </AdminShell>
  );
}

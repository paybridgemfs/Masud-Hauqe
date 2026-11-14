'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unlink,
  FolderCheck,
  Youtube,
  Music,
  Image as ImageIcon,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';

export default function GoogleDriveClient({
  initialIntegration,
  envConfigured = false,
  redirectUri = '',
  scopes = [],
  youtubeConfigured = false,
  queryConnected = false,
  queryError = '',
}) {
  const [integration, setIntegration] = useState(initialIntegration || {});
  const [status, setStatus] = useState(
    queryConnected
      ? {
          type: 'success',
          text: 'Google Drive account connected! "Musics" and "Images" folders have been automatically created and their IDs saved in PostgreSQL.',
        }
      : queryError
      ? { type: 'error', text: `Google OAuth Error: ${queryError}` }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'connect' | 'folders' | 'disconnect'
  const [copiedKey, setCopiedKey] = useState('');

  const isInternal = (url) => /localhost:(1000\b|10000\b)|127\.0\.0\.1:(1000\b|10000\b)/.test(url || '');
  const browserOrigin =
    typeof window !== 'undefined' && !isInternal(window.location.origin)
      ? window.location.origin
      : redirectUri.replace(/\/api\/integrations\/google\/callback$/, '');
  const activeRedirectUri =
    typeof window !== 'undefined' && !isInternal(window.location.origin)
      ? `${window.location.origin}/api/integrations/google/callback`
      : redirectUri;

  const refreshIntegrationStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/google', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.ok && data.integration) {
        setIntegration(data.integration);
      }
    } catch {
      // Ignore background refresh error
    }
  }, []);

  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
        setLoading(false);
        setStatus({
          type: 'success',
          text: 'Google Drive account connected! "Musics" and "Images" folders have been automatically created and saved in PostgreSQL.',
        });
        refreshIntegrationStatus();
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
        setLoading(false);
        setStatus({
          type: 'error',
          text: `Google OAuth Error: ${event.data.error || 'Authentication failed.'}`,
        });
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshIntegrationStatus]);

  function copyToClipboard(text, key) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    }
  }

  async function handleConnectGoogle() {
    setLoading(true);
    setActiveAction('connect');
    setStatus(null);
    try {
      const currentOrigin =
        typeof window !== 'undefined' && !isInternal(window.location.origin)
          ? window.location.origin
          : browserOrigin;
      const res = await fetch('/api/integrations/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'connect', origin: currentOrigin }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ type: 'error', text: data.error || 'Could not initiate Google OAuth 2.0.' });
        setLoading(false);
        setActiveAction(null);
        return;
      }

      const popup = window.open(
        data.authUrl,
        'google_drive_oauth',
        'width=580,height=720,menubar=no,toolbar=no,location=yes,status=no'
      );
      if (!popup) {
        window.location.href = data.authUrl;
      }
    } catch {
      setStatus({ type: 'error', text: 'Failed to reach Google OAuth server endpoint.' });
      setLoading(false);
      setActiveAction(null);
    }
  }

  async function handleEnsureFolders() {
    setLoading(true);
    setActiveAction('folders');
    setStatus(null);
    try {
      const res = await fetch('/api/integrations/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'ensureFolders' }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIntegration((prev) => ({
          ...prev,
          musicFolderId: data.folders.musicFolderId,
          musicFolderName: data.folders.musicFolderName,
          imageFolderId: data.folders.imageFolderId,
          imageFolderName: data.folders.imageFolderName,
          uploadFolderId: data.folders.musicFolderId,
          uploadFolderName: data.folders.musicFolderName,
        }));
        setStatus({ type: 'success', text: data.message });
      } else {
        setStatus({
          type: 'error',
          text: data.error || 'Failed to verify or auto-create Google Drive folders.',
        });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error while verifying Google Drive folders.' });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setActiveAction('disconnect');
    try {
      const res = await fetch('/api/integrations/google', {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIntegration((prev) => ({
          ...prev,
          connected: false,
          accountEmail: '',
          musicFolderId: '',
          imageFolderId: '',
          uploadFolderId: '',
          connectedAt: null,
        }));
        setStatus({
          type: 'success',
          text: 'Google Drive account disconnected and tokens cleared.',
        });
      }
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }

  const musicFolderId = integration.musicFolderId || integration.uploadFolderId || '';
  const imageFolderId = integration.imageFolderId || '';

  return (
    <div className="space-y-8">
      {status && (
        <div
          role="alert"
          className={`p-4 rounded border text-xs sm:text-sm flex items-start gap-2.5 ${
            status.type === 'success'
              ? 'bg-[#11261B] border-[#166534] text-[#BBF7D0]'
              : 'bg-[#2A1215] border-[#7F1D1D] text-[#FECACA]'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
          )}
          <span>{status.text}</span>
        </div>
      )}

      {/* Google Drive OAuth Connection Card */}
      <section className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E1E24] pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded bg-[#181713] border border-[#C8A464]/40 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-[#C8A464]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F4F1EA]">Google Drive API v3 Storage</h2>
              <p className="text-xs text-[#8E8E96]">
                OAuth 2.0 scope: <code className="text-[#C8A464]">{scopes.join(', ')}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {integration.connected ? (
              <>
                <button
                  type="button"
                  onClick={handleEnsureFolders}
                  disabled={loading}
                  className="px-4 py-2 rounded border border-[#C8A464]/40 hover:border-[#C8A464] text-xs font-semibold text-[#C8A464] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading && activeAction === 'folders' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderCheck className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {loading && activeAction === 'folders' ? 'Syncing...' : 'Sync Auto-Folders'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={loading}
                  className="px-4 py-2 rounded border border-[#2E2E38] hover:border-[#C8A464] text-xs font-semibold text-[#F4F1EA] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading && activeAction === 'connect' ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {loading && activeAction === 'connect' ? 'Reconnecting...' : 'Reconnect Account'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-4 py-2 rounded border border-[#7F1D1D] hover:bg-[#2A1215] text-xs font-semibold text-[#FCA5A5] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading && activeAction === 'disconnect' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {loading && activeAction === 'disconnect' ? 'Disconnecting...' : 'Disconnect'}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={loading}
                className="px-5 py-2.5 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-xs font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{loading ? 'Connecting...' : 'Connect Google Account via OAuth 2.0'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry & Connection Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded bg-[#09090B] border border-[#27272E]">
            <p className="text-[#8E8E96]">CONNECTION STATUS</p>
            <p
              className={`text-sm font-bold mt-1 ${
                integration.connected ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
              }`}
            >
              {integration.connected ? 'Connected' : 'Disconnected'}
            </p>
          </div>

          <div className="p-4 rounded bg-[#09090B] border border-[#27272E]">
            <p className="text-[#8E8E96]">CONNECTED ACCOUNT EMAIL</p>
            <p className="text-sm font-semibold text-[#F4F1EA] mt-1 truncate">
              {integration.accountEmail || 'No account connected'}
            </p>
          </div>

          <div className="p-4 rounded bg-[#09090B] border border-[#27272E]">
            <p className="text-[#8E8E96]">LAST SUCCESSFUL UPLOAD</p>
            <p className="text-sm font-semibold text-[#F4F1EA] mt-1 tabular-nums">
              {integration.lastUploadAt
                ? new Date(integration.lastUploadAt).toLocaleString('en-US')
                : 'No uploads recorded yet'}
            </p>
          </div>

          <div className="p-4 rounded bg-[#09090B] border border-[#27272E]">
            <p className="text-[#8E8E96]">ENV CREDENTIALS (.env)</p>
            <p
              className={`text-sm font-semibold mt-1 ${
                envConfigured ? 'text-[#4ADE80]' : 'text-[#FBBF24]'
              }`}
            >
              {envConfigured ? 'GOOGLE_CLIENT_ID Configured' : 'Missing in .env'}
            </p>
          </div>
        </div>

        {/* Automatically Provisioned Drive Folders ("Musics" & "Images") */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F4F1EA] flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-[#C8A464]" />
              <span>Automatic Google Drive Folders (Database-Managed)</span>
            </h3>
            <span className="text-[11px] text-[#8E8E96]">
              Auto-created in Drive upon account connection
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-[#09090B] border border-[#27272E] flex items-start gap-3">
              <Music className="w-5 h-5 text-[#C8A464] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#F4F1EA]">Folder: &quot;Musics&quot;</p>
                  <span
                    className={`text-[11px] font-semibold ${
                      musicFolderId ? 'text-[#4ADE80]' : 'text-[#8E8E96]'
                    }`}
                  >
                    {musicFolderId ? 'Saved in DB' : 'Pending Connection'}
                  </span>
                </div>
                <p className="text-[11px] text-[#8E8E96] mt-0.5">
                  Stores all uploaded MP3 master audio files.
                </p>
                <p className="text-xs font-mono text-[#C8A464] mt-1.5 truncate">
                  ID: {musicFolderId || 'Will auto-create on connect'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded bg-[#09090B] border border-[#27272E] flex items-start gap-3">
              <ImageIcon className="w-5 h-5 text-[#C8A464] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#F4F1EA]">Folder: &quot;Images&quot;</p>
                  <span
                    className={`text-[11px] font-semibold ${
                      imageFolderId ? 'text-[#4ADE80]' : 'text-[#8E8E96]'
                    }`}
                  >
                    {imageFolderId ? 'Saved in DB' : 'Pending Connection'}
                  </span>
                </div>
                <p className="text-[11px] text-[#8E8E96] mt-0.5">
                  Stores all uploaded portraits, release covers, gallery photos, and branding images.
                </p>
                <p className="text-xs font-mono text-[#C8A464] mt-1.5 truncate">
                  ID: {imageFolderId || 'Will auto-create on connect'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* YouTube Data API v3 Status & Technical Delivery Notes */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <Youtube className="w-5 h-5 text-[#C8A464]" />
            <h2 className="text-base font-bold text-[#F4F1EA]">YouTube Data API v3 Metadata</h2>
          </div>
          <p className="text-xs text-[#9A9AA2] leading-relaxed">
            Used on the Add Music page to retrieve official video title, thumbnail, description, and ISO duration from a YouTube video URL.
          </p>
          <p className="text-xs">
            Environment Key Status:{' '}
            <span
              className={
                youtubeConfigured ? 'text-[#4ADE80] font-semibold' : 'text-[#FBBF24] font-semibold'
              }
            >
              {youtubeConfigured ? 'YOUTUBE_API_KEY Active' : 'Configure YOUTUBE_API_KEY in .env'}
            </span>
          </p>
        </div>

        <div className="bg-[#111115] border border-[#222228] rounded-lg p-6 space-y-3 text-xs text-[#9A9AA2]">
          <h2 className="text-base font-bold text-[#F4F1EA]">
            Google Cloud Console — OAuth 2.0 Setup URLs
          </h2>
          <p className="text-[11px] text-[#8E8E96]">
            Add both of these exact URLs in Google Cloud Console → APIs &amp; Services → Credentials → OAuth 2.0 Client ID:
          </p>

          <div className="space-y-2 pt-1">
            <div>
              <span className="block text-[11px] font-semibold text-[#D4D4D8] mb-1">
                1. Authorized JavaScript origins:
              </span>
              <div className="flex items-center justify-between gap-2 bg-[#09090B] border border-[#27272E] rounded px-3 py-2">
                <code className="text-[#C8A464] break-all">{browserOrigin}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(browserOrigin, 'origin')}
                  className="p-1 text-[#9A9AA2] hover:text-[#F4F1EA] shrink-0"
                  title="Copy Origin"
                >
                  {copiedKey === 'origin' ? (
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-[#D4D4D8] mb-1">
                2. Authorized redirect URIs (Required to prevent redirect_uri_mismatch):
              </span>
              <div className="flex items-center justify-between gap-2 bg-[#09090B] border border-[#27272E] rounded px-3 py-2">
                <code className="text-[#C8A464] break-all">{activeRedirectUri}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(activeRedirectUri, 'redirect')}
                  className="p-1 text-[#9A9AA2] hover:text-[#F4F1EA] shrink-0"
                  title="Copy Redirect URI"
                >
                  {copiedKey === 'redirect' ? (
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

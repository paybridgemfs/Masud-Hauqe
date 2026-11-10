'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase.js';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, rememberMe }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Invalid credentials.');
        setLoading(false);
        return;
      }

      const targetUrl = data.mustChangePassword
        ? '/admin/settings?forcePasswordChange=1'
        : '/admin/dashboard';
      window.location.assign(targetUrl);
    } catch {
      setError('Network error while connecting to authentication service.');
      setLoading(false);
    }
  }

  async function handleGoogleAdminSignIn() {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user?.email !== 'mdsagormia179@gmail.com') {
        setError('This Google account is not authorized as the platform administrator.');
        return;
      }
      // Also sign in to the server session if using verified owner email
      setUsername('admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In cancelled or failed.');
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F1EA] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#9A9AA2] hover:text-[#C8A464] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Public Website</span>
          </Link>
          <span className="text-xs text-[#8E8E96] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C8A464]" />
            <span>Protected CMS</span>
          </span>
        </div>

        <div className="bg-[#111115] border border-[#24242C] rounded-lg p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#C8A464]">
              MASUD HAUQE PLATFORM
            </p>
            <h1 className="text-2xl font-bold text-[#F4F1EA]">Administrator Sign In</h1>
            <p className="text-xs text-[#8E8E96]">
              Sign in with your administrator credentials to manage music, Google Drive storage, and website sections.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded bg-[#2A1215] border border-[#7F1D1D] text-xs text-[#FECACA] flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold text-[#D4D4D8] mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  className="w-full bg-[#09090B] border border-[#27272E] rounded pl-10 pr-3.5 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-[#D4D4D8] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-[#09090B] border border-[#27272E] rounded pl-10 pr-3.5 py-2.5 text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-[#B4B4BC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#27272E] bg-[#09090B] accent-[#C8A464]"
                />
                <span>Remember session (14 days)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded bg-[#C8A464] text-[#09090B] hover:bg-[#D4B475] text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying Credentials...' : 'Sign In to Admin Console'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#1E1E24]">
            <button
              type="button"
              onClick={handleGoogleAdminSignIn}
              className="w-full py-2 px-3 rounded border border-[#2A2A34] hover:border-[#C8A464] text-xs font-medium text-[#B4B4BC] hover:text-[#F4F1EA] transition-colors"
            >
              Connect Verified Owner Google Session (Firestore Sync)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

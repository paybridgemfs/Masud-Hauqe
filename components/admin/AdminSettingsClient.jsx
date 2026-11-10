'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, KeyRound, UserCheck, CheckCircle2, AlertCircle, Activity } from 'lucide-react';

export default function AdminSettingsClient({ admin, auditLogs = [], promptPasswordChange = false }) {
  const router = useRouter();

  // Profile form state
  const [name, setName] = useState(admin?.name || 'Masud Hauqe');
  const [email, setEmail] = useState(admin?.email || 'mdsagormia179@gmail.com');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'profile',
          name,
          email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to update admin profile.');
      } else {
        setNotice('Administrator profile updated.');
        router.refresh();
      }
    } catch {
      setError('Network error while updating profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to update password.');
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setNotice('Administrator password updated and security prompt cleared.');
        router.refresh();
      }
    } catch {
      setError('Network error while updating password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {notice && (
        <div className="p-4 bg-[#2E9B68]/10 border border-[#2E9B68]/30 rounded text-sm text-[#2E9B68] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#D64545]/10 border border-[#D64545]/30 rounded text-sm text-[#D64545] flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Administrator Profile */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#F4F1EA]/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-[#C8A464]" />
              <h2 className="text-base font-bold text-[#F4F1EA]">Administrator Account</h2>
            </div>
            <span className="text-xs font-mono text-[#9E9A90]">@{admin?.username || 'admin'}</span>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Administrator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-5 py-2.5 bg-[#18181F] hover:bg-[#C8A464] hover:text-[#09090B] border border-[#F4F1EA]/[0.12] text-[#F4F1EA] font-bold text-xs uppercase tracking-widest rounded transition-colors"
            >
              {profileSaving ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form
          onSubmit={handleChangePassword}
          className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#F4F1EA]/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-[#C8A464]" />
              <h2 className="text-base font-bold text-[#F4F1EA]">Change Admin Password</h2>
            </div>
            {admin?.mustChangePassword && (
              <span className="text-xs uppercase tracking-wider text-[#D99B26] font-semibold">
                Action Recommended
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
              placeholder="Enter current password"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
                New Password (Min 6 chars)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                placeholder="New strong password"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9E9A90] font-semibold mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 px-3.5 bg-[#09090B] border border-[#F4F1EA]/[0.12] rounded text-sm text-[#F4F1EA] focus:outline-none focus:border-[#C8A464]"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-6 py-2.5 bg-[#C8A464] hover:bg-[#E2C285] disabled:opacity-50 text-[#09090B] font-bold text-xs uppercase tracking-widest rounded transition-colors"
            >
              {passwordSaving ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Audit Trail */}
      <div className="bg-[#111115] border border-[#F4F1EA]/[0.08] rounded p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#F4F1EA]/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-[#C8A464]" />
            <h2 className="text-base font-bold text-[#F4F1EA]">Administrative Audit Log</h2>
          </div>
          <span className="text-xs text-[#9E9A90] tabular-nums">
            Showing latest {auditLogs.length} events
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-[#9E9A90] py-6 text-center">No administrative events logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F4F1EA]/[0.08] text-[11px] uppercase tracking-wider text-[#9E9A90]">
                  <th className="py-2.5 pr-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Target ID</th>
                  <th className="py-2.5 pl-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EA]/[0.05] text-xs">
                {auditLogs.slice(0, 25).map((log) => (
                  <tr key={log.id} className="hover:bg-[#18181F]/60">
                    <td className="py-2.5 pr-4 font-mono text-[#C8A464]">{log.action}</td>
                    <td className="py-2.5 px-4 text-[#F4F1EA]">{log.entityType}</td>
                    <td className="py-2.5 px-4 text-[#9E9A90] font-mono truncate max-w-[180px]">
                      {log.entityId || '—'}
                    </td>
                    <td className="py-2.5 pl-4 text-right text-[#68645E] tabular-nums">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

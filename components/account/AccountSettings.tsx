'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthApiError, authApi } from '@/lib/auth-api';
import { useAuth } from '@/providers';

const passwordPolicy = /^(?=.{12,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;

export function AccountSettings() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setError(null);

    if (!currentPassword || currentPassword.length > 128) {
      setError('Enter your current password.');
      return;
    }
    if (!passwordPolicy.test(newPassword)) {
      setError('Use 12–128 characters with upper/lowercase letters, a number, and a symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback('Your password was changed successfully.');
    } catch (cause) {
      setError(cause instanceof AuthApiError ? cause.message : 'Unable to change your password.');
    } finally {
      setIsSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <main className="lab-data-state" style={{ minHeight: '100svh', display: 'block', paddingTop: 56 }}>
      <section className="lab-panel" style={{ maxWidth: 620, margin: '0 auto', textAlign: 'left' }}>
        <Link href="/dashboard" className="text-[9px] font-mono text-white/40 hover:text-white/80 uppercase tracking-widest">
          ← Workspace dashboard
        </Link>
        <span style={{ display: 'block', marginTop: 32 }}>Account settings</span>
        <h1 className="mt-3 text-3xl font-light text-white">Secure your account.</h1>
        <p className="mt-3 text-sm text-white/50">Signed in as {user?.email ?? 'your account'}.</p>

        <form onSubmit={changePassword} className="mt-9 grid gap-5" aria-label="Change password form">
          <label className="grid gap-2 text-[9px] font-mono uppercase tracking-widest text-white/40">
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="grid gap-2 text-[9px] font-mono uppercase tracking-widest text-white/40">
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="grid gap-2 text-[9px] font-mono uppercase tracking-widest text-white/40">
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-white/40"
            />
          </label>

          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          {feedback && <p role="status" className="text-xs text-emerald-300">{feedback}</p>}

          <button type="submit" disabled={isSaving} className="world-command mt-2 justify-center disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? 'Updating…' : 'Change password'}
          </button>
        </form>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-xs text-white/50">Sign out of this authenticated session.</p>
          <button type="button" onClick={() => void signOut()} className="lab-logout mt-4">Log out</button>
        </div>
      </section>
    </main>
  );
}

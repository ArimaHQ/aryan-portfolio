'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ApiClientError, apiClient } from '@/lib/api-client';
import styles from './MfaEnroll.module.css';

type EnrollmentResponse = { enabled: boolean; otpauth_uri: string };

const errorMessage = (cause: unknown, fallback: string) => (
  cause instanceof ApiClientError || cause instanceof Error ? cause.message : fallback
);

export default function MfaEnrollPage() {
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const generateUri = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await apiClient<EnrollmentResponse>('/api/v1/auth/mfa/enroll', { method: 'POST' });
      if (!response.otpauth_uri.startsWith('otpauth://')) throw new Error('The setup URI was not returned.');
      setUri(response.otpauth_uri);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to generate the setup URI.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the current six-digit authenticator code.');
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      await apiClient('/api/v1/auth/mfa/verify', { method: 'POST', body: { code } });
      setCode('');
      setSuccess(true);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to verify the authenticator code.'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/admin" className={styles.backLink}>← Founder Control</Link>
        <p className={styles.eyebrow}>Privileged security</p>
        <h1>Enroll privileged MFA</h1>
        <p className={styles.muted}>Add this account to your authenticator before continuing to Founder Control.</p>
      </header>

      <section className={styles.panel} aria-labelledby="mfa-enrollment-heading">
        <h2 id="mfa-enrollment-heading">Authenticator setup</h2>
        <p className={styles.muted}>Generate a setup URI, add it to your authenticator app, then enter the current six-digit code.</p>
        <button type="button" className={styles.button} onClick={() => void generateUri()} disabled={isGenerating || success}>
          {isGenerating ? 'Generating…' : 'Generate setup URI'}
        </button>

        {uri ? (
          <>
            <p className={styles.muted}>Copy this URI into your authenticator app:</p>
            <code className={styles.uri} data-testid="mfa-setup-uri">{uri}</code>
            <form className={styles.form} onSubmit={verifyCode}>
              <label htmlFor="mfa-code">Current 6-digit code</label>
              <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
              <button type="submit" className={styles.button} disabled={isVerifying || success}>
                {isVerifying ? 'Verifying…' : 'Enable MFA'}
              </button>
            </form>
          </>
        ) : null}

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {success ? <p className={styles.success} role="status">MFA enabled. Your existing sessions were signed out for security. Please sign in again.</p> : null}
      </section>
    </main>
  );
}

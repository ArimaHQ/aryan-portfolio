'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers';
import {
  beginMicrosoftAuthorization,
  disconnectMicrosoft,
  getMicrosoftIntegrationStatus,
  type MicrosoftIntegrationStatus,
} from '@/lib/microsoft-integration-api';

export function MicrosoftIntegrationPanel() {
  const { user, isInitialized, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<MicrosoftIntegrationStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workspaceId = user?.workspaceId;

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const next = await getMicrosoftIntegrationStatus(workspaceId);
      setStatus(next);
      setVisible(true);
    } catch (cause) {
      // A normal member receives the server's Founder authorization denial.
      // Keep the integration surface invisible to that user.
      const message = cause instanceof Error ? cause.message : '';
      if (!message.toLowerCase().includes('permission') && !message.toLowerCase().includes('founder')) {
        setError('Microsoft status is unavailable.');
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return undefined;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isInitialized, load]);

  const connect = async () => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      await beginMicrosoftAuthorization(workspaceId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Microsoft authorization failed.');
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      await disconnectMicrosoft(workspaceId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Microsoft disconnect failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!visible || !status) return null;
  const live = status.status === 'LIVE';
  return (
    <aside className="microsoft-integration-panel" aria-label="Microsoft Outlook integration">
      <div>
        <span className="lab-eyebrow">Founder control</span>
        <h2>Microsoft / Outlook</h2>
        <p><strong data-status={status.status}>{status.status.replaceAll('_', ' ')}</strong></p>
        {status.account_id && <small>Connected account: {status.account_id}</small>}
      </div>
      {error && <p role="alert">{error}</p>}
      {live ? (
        <button type="button" onClick={() => void disconnect()} disabled={busy}>
          {busy ? 'Disconnecting…' : 'Disconnect'}
        </button>
      ) : (
        <button type="button" onClick={() => void connect()} disabled={busy}>
          {busy ? 'Opening Microsoft…' : 'Connect Microsoft'}
        </button>
      )}
    </aside>
  );
}

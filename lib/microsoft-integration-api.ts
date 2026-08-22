import { getAccessToken, getCsrfToken } from '@/lib/auth-api';
import { apiClient } from '@/lib/api-client';

export type MicrosoftIntegrationStatus = {
  provider: 'microsoft';
  status: 'LIVE' | 'CONFIGURED_BUT_UNVERIFIED' | 'NOT_CONFIGURED' | 'DISABLED';
  account_id?: string;
};

export async function getMicrosoftIntegrationStatus(
  workspaceId: string,
): Promise<MicrosoftIntegrationStatus> {
  return apiClient<MicrosoftIntegrationStatus>(
    `/api/v1/integrations/microsoft/status?workspace_id=${encodeURIComponent(workspaceId)}`,
  );
}

/**
 * Obtain the server-generated OAuth redirect without putting credentials in
 * the browser URL or relying on a second authentication mechanism.
 */
export async function beginMicrosoftAuthorization(workspaceId: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(
    `/api/v1/integrations/microsoft/authorize?workspace_id=${encodeURIComponent(workspaceId)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!response.ok) {
    throw new Error('Microsoft authorization could not be started.');
  }
  const payload = await response.json() as { authorization_url?: unknown };
  if (typeof payload.authorization_url !== 'string') {
    throw new Error('Microsoft authorization redirect is unavailable.');
  }
  window.location.assign(payload.authorization_url);
}

export async function disconnectMicrosoft(workspaceId: string): Promise<void> {
  const token = getAccessToken();
  const csrf = await getCsrfToken();
  const response = await fetch(
    `/api/v1/integrations/microsoft/disconnect?workspace_id=${encodeURIComponent(workspaceId)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-CSRF-Token': csrf,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!response.ok) throw new Error('Microsoft could not be disconnected.');
}

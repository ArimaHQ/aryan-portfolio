import { authApi, getAccessToken, getCsrfToken } from '@/lib/auth-api';

const DEFAULT_TIMEOUT = 30_000;

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
);

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export type ApiClientOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /**
   * Explicitly opt in or out of CSRF protection. Unsafe methods are protected
   * by default so new authenticated mutations cannot accidentally omit it.
   */
  csrf?: boolean;
  timeout?: number;
};

const correlationId = (prefix: string) => (
  globalThis.crypto?.randomUUID?.()
  ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const isAuthenticationRequest = (path: string) => (
  path.split('?')[0]?.includes('/api/v1/auth/') ?? false
);

const errorFromResponse = (payload: unknown, status: number) => {
  const record = asRecord(payload);
  const detail = asRecord(record?.detail);
  const message = typeof record?.message === 'string' ? record.message
    : typeof record?.error === 'string' ? record.error
    : typeof detail?.message === 'string' ? detail.message
    : typeof record?.detail === 'string' ? record.detail
    : 'Request failed.';
  const code = typeof record?.code === 'string' ? record.code
    : typeof detail?.code === 'string' ? detail.code
    : undefined;
  return new ApiClientError(message, status, code);
};

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    csrf = method !== 'GET',
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  const send = async (retryUnauthorized: boolean): Promise<T> => {
    const token = getAccessToken();
    const headers = new Headers({
      Accept: 'application/json',
      'X-Correlation-ID': correlationId('api'),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (csrf) headers.set('X-CSRF-Token', await getCsrfToken());

    const response = await fetch(path, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    let payload: unknown;
    if (contentType.includes('application/json')) {
      payload = await response.json();
    } else {
      const text = await response.text();
      payload = text ? { message: text } : {};
    }

    const requestError = response.ok ? null : errorFromResponse(payload, response.status);
    if (
      requestError?.status === 401
      && retryUnauthorized
      && !isAuthenticationRequest(path)
    ) {
      let refreshed = false;
      try {
        await authApi.refresh();
        refreshed = true;
      } catch {
        // Preserve the original API failure when there is no refreshable session.
      }
      if (refreshed) return send(false);
    }

    if (requestError) throw requestError;
    return payload as T;
  };

  try {
    return await send(true);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiClientError('Request timed out. Please try again.');
      }
      throw new ApiClientError(error.message);
    }
    throw new ApiClientError('An unexpected error occurred.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function apiClientWithCsrf<T>(
  path: string,
  options: Omit<ApiClientOptions, 'csrf'> = {},
): Promise<T> {
  return apiClient<T>(path, { ...options, csrf: true });
}

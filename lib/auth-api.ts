import type { User } from '@/types';

const API_URL = '';
const AUTH_PATH = '/api/v1/auth';

type JsonRecord = Record<string, unknown>;

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User | null;
};

export type RegistrationResult = {
  user: User;
  verificationRequired: boolean;
};

export type AuthSessionRecord = {
  familyId: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isPersistent: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  current: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
  rememberMe: boolean;
};

let accessToken: string | null = null;
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let refreshRequest: Promise<AuthSession> | null = null;
let sessionGeneration = 0;

const REFRESH_LOCK_NAME = 'arima-auth-refresh';
const REFRESH_LOCK_STORAGE_KEY = `${REFRESH_LOCK_NAME}:lock`;
const REFRESH_LOCK_LEASE_MS = 30_000;
const REFRESH_LOCK_RETRY_MS = 50;

type RefreshLock = {
  owner: string;
  expiresAt: number;
};

const asRecord = (value: unknown): JsonRecord | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
);

const stringValue = (value: unknown): string | undefined => (
  typeof value === 'string' && value.length > 0 ? value : undefined
);

const booleanValue = (value: unknown): boolean | undefined => (
  typeof value === 'boolean' ? value : undefined
);

const unwrap = (value: unknown): JsonRecord => {
  const record = asRecord(value);
  if (!record) return {};
  const data = asRecord(record.data);
  return data ?? record;
};

const correlationId = () => (
  globalThis.crypto?.randomUUID?.()
  ?? `auth-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const apiUrl = (path: string) => {
  if (!API_URL) return path;
  return `${API_URL}${path}`;
};

const responseMessage = (payload: unknown, fallback: string): { message: string; code?: string } => {
  const record = unwrap(payload);
  const detail = record.detail;
  const detailRecord = asRecord(detail);
  const message = stringValue(record.message)
    ?? stringValue(record.error)
    ?? stringValue(detail)
    ?? stringValue(detailRecord?.message)
    ?? fallback;
  const code = stringValue(record.code) ?? stringValue(detailRecord?.code);
  return { message, code };
};

const readPayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  return text ? { message: text } : {};
};

const setSessionTokens = (nextAccessToken: string | null, nextCsrfToken?: string | null) => {
  accessToken = nextAccessToken;
  if (nextCsrfToken !== undefined) csrfToken = nextCsrfToken;
};

export const getAccessToken = () => accessToken;

export const clearAuthSession = () => {
  sessionGeneration += 1;
  setSessionTokens(null, null);
  csrfRequest = null;
};

const parseRefreshLock = (value: string | null): RefreshLock | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    const record = asRecord(parsed);
    const owner = stringValue(record?.owner);
    const expiresAt = record?.expiresAt;
    if (!owner || typeof expiresAt !== 'number') return null;
    return { owner, expiresAt };
  } catch {
    return null;
  }
};

const waitForRefreshLock = () => new Promise<void>((resolve) => {
  window.setTimeout(resolve, REFRESH_LOCK_RETRY_MS);
});

async function withStorageRefreshLock<T>(operation: () => Promise<T>): Promise<T> {
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return operation();
  }

  const owner = correlationId();
  while (true) {
    try {
      const current = parseRefreshLock(storage.getItem(REFRESH_LOCK_STORAGE_KEY));
      if (!current || current.expiresAt <= Date.now()) {
        storage.setItem(
          REFRESH_LOCK_STORAGE_KEY,
          JSON.stringify({ owner, expiresAt: Date.now() + REFRESH_LOCK_LEASE_MS }),
        );
        if (parseRefreshLock(storage.getItem(REFRESH_LOCK_STORAGE_KEY))?.owner === owner) {
          break;
        }
      }
    } catch {
      return operation();
    }
    await waitForRefreshLock();
  }

  const renewLease = () => {
    try {
      const current = parseRefreshLock(storage.getItem(REFRESH_LOCK_STORAGE_KEY));
      if (current?.owner === owner) {
        storage.setItem(
          REFRESH_LOCK_STORAGE_KEY,
          JSON.stringify({ owner, expiresAt: Date.now() + REFRESH_LOCK_LEASE_MS }),
        );
      }
    } catch {
      // Storage can become unavailable after the lock has been acquired.
    }
  };
  const renewal = window.setInterval(renewLease, REFRESH_LOCK_LEASE_MS / 3);
  try {
    return await operation();
  } finally {
    window.clearInterval(renewal);
    try {
      if (parseRefreshLock(storage.getItem(REFRESH_LOCK_STORAGE_KEY))?.owner === owner) {
        storage.removeItem(REFRESH_LOCK_STORAGE_KEY);
      }
    } catch {
      // A stale lease expires automatically if storage is unavailable.
    }
  }
}

async function withCrossTabRefreshLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return operation();
  if (window.navigator.locks) {
    return window.navigator.locks.request(
      REFRESH_LOCK_NAME,
      { mode: 'exclusive' },
      operation,
    );
  }
  return withStorageRefreshLock(operation);
}

const normalizeUser = (payload: unknown, defaultEmailVerified: boolean): User => {
  const record = unwrap(payload);
  const firstName = stringValue(record.first_name) ?? stringValue(record.firstName) ?? '';
  const lastName = stringValue(record.last_name) ?? stringValue(record.lastName) ?? '';
  const workspace = asRecord(record.workspace);
  const suppliedName = stringValue(record.name);
  const derivedName = `${firstName} ${lastName}`.trim();
  const name = suppliedName || derivedName || stringValue(record.email) || 'Arima user';
  const id = stringValue(record.id) ?? stringValue(record.user_id);
  const email = stringValue(record.email);

  if (!id || !email) {
    throw new AuthApiError('The authentication service returned an invalid user profile.');
  }

  return {
    id,
    email,
    name,
    firstName,
    lastName,
    emailVerified: booleanValue(record.email_verified)
      ?? booleanValue(record.emailVerified)
      ?? booleanValue(record.is_verified)
      ?? defaultEmailVerified,
    workspaceId: stringValue(record.workspace_id)
      ?? stringValue(record.workspaceId)
      ?? stringValue(workspace?.id)
      ?? null,
    avatar: stringValue(record.avatar_url) ?? stringValue(record.avatar) ?? null,
    createdAt: stringValue(record.created_at) ?? stringValue(record.createdAt) ?? '',
  };
};

const userFromResponse = (payload: unknown, defaultEmailVerified: boolean): User => {
  const record = unwrap(payload);
  return normalizeUser(asRecord(record.user) ?? record, defaultEmailVerified);
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  csrf?: boolean;
  authorization?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    csrf = false,
    authorization = false,
  } = options;
  const headers = new Headers({
    Accept: 'application/json',
    'X-Correlation-ID': correlationId(),
  });

  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (csrf) headers.set('X-CSRF-Token', await getCsrfToken());
  if (authorization && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError('Unable to reach the authentication service. Please try again.');
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    const { message, code } = responseMessage(payload, 'Authentication request failed.');
    throw new AuthApiError(message, response.status, code);
  }
  return payload as T;
}

/**
 * Returns the current double-submit CSRF token, obtaining one through the
 * existing authentication endpoint when the browser does not have one yet.
 *
 * This is shared with the general API client so authenticated mutations use
 * the same token lifecycle as the authentication flows.
 */
export async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = request<unknown>(`${AUTH_PATH}/csrf`, { method: 'POST' })
      .then((payload) => {
        const token = stringValue(unwrap(payload).csrf_token) ?? stringValue(unwrap(payload).csrfToken);
        if (!token) throw new AuthApiError('The authentication service did not provide a CSRF token.');
        csrfToken = token;
        return token;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

const sessionFromResponse = (payload: unknown, requireUser: boolean): AuthSession => {
  const record = unwrap(payload);
  const nextAccessToken = stringValue(record.access_token) ?? stringValue(record.accessToken);
  if (!nextAccessToken) {
    throw new AuthApiError('The authentication service did not provide an access token.');
  }

  const nextCsrfToken = stringValue(record.csrf_token) ?? stringValue(record.csrfToken);
  setSessionTokens(nextAccessToken, nextCsrfToken);
  const userPayload = asRecord(record.user);
  const user = userPayload ? normalizeUser(userPayload, true) : null;
  if (requireUser && !user) {
    throw new AuthApiError('The authentication service did not provide a user profile.');
  }

  return {
    accessToken: nextAccessToken,
    tokenType: stringValue(record.token_type) ?? stringValue(record.tokenType) ?? 'bearer',
    expiresIn: Number(record.expires_in ?? record.expiresIn ?? 0),
    user,
  };
};

async function refreshSession(): Promise<AuthSession> {
  const generation = sessionGeneration;
  const payload = await request<unknown>(`${AUTH_PATH}/refresh`, {
    method: 'POST',
    csrf: true,
  });
  if (generation !== sessionGeneration) {
    throw new AuthApiError('The active session changed while it was refreshing.');
  }
  return sessionFromResponse(payload, false);
}

const refresh = (): Promise<AuthSession> => {
  if (refreshRequest) return refreshRequest;
  const pending = withCrossTabRefreshLock(refreshSession);
  refreshRequest = pending;
  const clearPending = () => {
    if (refreshRequest === pending) refreshRequest = null;
  };
  void pending.then(clearPending, clearPending);
  return pending;
};

export const authApi = {
  async register(input: { email: string; password: string; firstName: string; lastName: string }): Promise<RegistrationResult> {
    const payload = await request<unknown>(`${AUTH_PATH}/register`, {
      method: 'POST',
      csrf: true,
      body: {
        email: input.email,
        password: input.password,
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });
    const record = unwrap(payload);
    return {
      user: userFromResponse(payload, false),
      verificationRequired: booleanValue(record.verification_required)
        ?? booleanValue(record.verificationRequired)
        ?? true,
    };
  },

  async login(input: LoginInput): Promise<AuthSession> {
    const payload = await request<unknown>(`${AUTH_PATH}/login`, {
      method: 'POST',
      csrf: true,
      body: {
        email: input.email,
        password: input.password,
        remember_me: input.rememberMe,
      },
    });
    return sessionFromResponse(payload, true);
  },

  refresh,

  async me(): Promise<User> {
    const payload = await request<unknown>(`${AUTH_PATH}/me`, { authorization: true });
    return userFromResponse(payload, true);
  },

  async logout(): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/logout`, { method: 'POST', csrf: true });
  },

  async logoutAll(): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/logout-all`, {
      method: 'POST',
      csrf: true,
      authorization: true,
    });
  },

  async updateProfile(input: { firstName?: string; lastName?: string }): Promise<User> {
    const payload = await request<unknown>(`${AUTH_PATH}/me`, {
      method: 'PATCH',
      csrf: true,
      authorization: true,
      body: {
        ...(input.firstName !== undefined ? { first_name: input.firstName } : {}),
        ...(input.lastName !== undefined ? { last_name: input.lastName } : {}),
      },
    });
    return userFromResponse(payload, true);
  },

  async sessions(): Promise<AuthSessionRecord[]> {
    const payload = await request<unknown>(`${AUTH_PATH}/sessions`, { authorization: true });
    const items = unwrap(payload).items;
    if (!Array.isArray(items)) {
      throw new AuthApiError('The authentication service returned invalid session data.');
    }
    return items.map((item) => {
      const record = asRecord(item);
      const familyId = stringValue(record?.family_id) ?? stringValue(record?.familyId);
      const createdAt = stringValue(record?.created_at) ?? stringValue(record?.createdAt);
      const expiresAt = stringValue(record?.expires_at) ?? stringValue(record?.expiresAt);
      if (!familyId || !createdAt || !expiresAt) {
        throw new AuthApiError('The authentication service returned invalid session data.');
      }
      return {
        familyId,
        createdAt,
        lastUsedAt: stringValue(record?.last_used_at) ?? stringValue(record?.lastUsedAt) ?? null,
        expiresAt,
        isPersistent: booleanValue(record?.is_persistent) ?? booleanValue(record?.isPersistent) ?? false,
        userAgent: stringValue(record?.user_agent) ?? stringValue(record?.userAgent) ?? null,
        ipAddress: stringValue(record?.ip_address) ?? stringValue(record?.ipAddress) ?? null,
        current: booleanValue(record?.current) ?? false,
      };
    });
  },

  async revokeSession(familyId: string): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/sessions/${encodeURIComponent(familyId)}`, {
      method: 'DELETE',
      csrf: true,
      authorization: true,
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/forgot-password`, {
      method: 'POST',
      csrf: true,
      body: { email },
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/reset-password`, {
      method: 'POST',
      csrf: true,
      body: { token, password },
    });
  },

  async changePassword(currentPassword: string, password: string): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/change-password`, {
      method: 'POST',
      csrf: true,
      authorization: true,
      body: { current_password: currentPassword, password },
    });
  },

  async changeEmail(newEmail: string, currentPassword: string): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/change-email`, {
      method: 'POST',
      csrf: true,
      authorization: true,
      body: { new_email: newEmail, current_password: currentPassword },
    });
  },

  async verifyEmail(token: string): Promise<User> {
    const payload = await request<unknown>(`${AUTH_PATH}/verify-email`, {
      method: 'POST',
      csrf: true,
      body: { token },
    });
    return userFromResponse(payload, true);
  },

  async confirmEmailChange(token: string): Promise<User> {
    const payload = await request<unknown>(`${AUTH_PATH}/change-email/confirm`, {
      method: 'POST',
      csrf: true,
      body: { token },
    });
    clearAuthSession();
    return userFromResponse(payload, true);
  },

  async resendVerificationEmail(email: string): Promise<void> {
    await request<unknown>(`${AUTH_PATH}/verify-email/resend`, {
      method: 'POST',
      csrf: true,
      body: { email },
    });
  },
};

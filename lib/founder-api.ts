import { ApiClientError, apiClient } from '@/lib/api-client';

type JsonRecord = Record<string, unknown>;

export type FounderConfigurationEnvironment = {
  name: string;
  present: boolean;
};

export type FounderConfigurationStatus = {
  state: 'configured' | 'configuration_required' | 'not_applicable' | 'not_configured' | 'manual_only';
  environment: FounderConfigurationEnvironment[];
};

export type FounderHealthStatus = 'operational' | 'configuration_required' | 'unavailable';

export type FounderHealthComponent = {
  key: string;
  label: string;
  status: FounderHealthStatus;
  checkedAt: string;
  latencyMs: number | null;
  provider: string | null;
  configuration: FounderConfigurationStatus;
  message: string | null;
};

export type FounderSystemHealth = {
  generatedAt: string;
  components: FounderHealthComponent[];
};

export type FounderFeedStatus = 'live' | 'manual' | 'stale' | 'unavailable';
export type FounderFeedFreshness = 'current' | 'stale' | 'unavailable';

export type FounderFeedError = {
  code: string;
  message: string;
};

export type FounderDataFeed = {
  key: string;
  label: string;
  provider: string | null;
  status: FounderFeedStatus;
  freshness: FounderFeedFreshness;
  lastUpdatedAt: string | null;
  source: string | null;
  enteredBy: string | null;
  notes: string | null;
  expiresAt: string | null;
  errors: FounderFeedError[];
  configuration: FounderConfigurationStatus;
  manualEntrySupported: boolean;
};

export type FounderDataFeeds = {
  generatedAt: string;
  feeds: FounderDataFeed[];
};

export type ManualObservationInput = {
  source: string;
  observedAt: string;
  notes?: string | null;
  expiresAt?: string | null;
};

export type ManualObservation = {
  id: string;
  feedKey: string;
  status: 'manual';
  source: string;
  observedAt: string;
  notes: string | null;
  expiresAt: string | null;
  enteredBy: string;
  correlationId: string;
  createdAt: string;
};

const configurationStates = new Set<FounderConfigurationStatus['state']>([
  'configured',
  'configuration_required',
  'not_applicable',
  'not_configured',
  'manual_only',
]);
const healthStatuses = new Set<FounderHealthStatus>([
  'operational',
  'configuration_required',
  'unavailable',
]);
const feedStatuses = new Set<FounderFeedStatus>(['live', 'manual', 'stale', 'unavailable']);
const feedFreshness = new Set<FounderFeedFreshness>(['current', 'stale', 'unavailable']);

const asRecord = (value: unknown): JsonRecord | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
);

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value) {
    throw new ApiClientError(`The Founder Control response contains an invalid ${field}.`);
  }
  return value;
};

const nullableString = (value: unknown, field: string) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new ApiClientError(`The Founder Control response contains an invalid ${field}.`);
  }
  return value;
};

const nullableNumber = (value: unknown, field: string) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiClientError(`The Founder Control response contains an invalid ${field}.`);
  }
  return value;
};

const requiredBoolean = (value: unknown, field: string) => {
  if (typeof value !== 'boolean') {
    throw new ApiClientError(`The Founder Control response contains an invalid ${field}.`);
  }
  return value;
};

const requiredArray = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new ApiClientError(`The Founder Control response contains an invalid ${field}.`);
  }
  return value;
};

const requiredRecord = (value: unknown, field: string): JsonRecord => {
  const record = asRecord(value);
  if (!record) {
    throw new ApiClientError(`The Founder Control response contains an invalid ${field}.`);
  }
  return record;
};

const parseConfiguration = (value: unknown, field: string): FounderConfigurationStatus => {
  const record = requiredRecord(value, field);
  const state = requiredString(record.state, `${field}.state`);
  if (!configurationStates.has(state as FounderConfigurationStatus['state'])) {
    throw new ApiClientError(`The Founder Control response contains an invalid ${field}.state.`);
  }
  return {
    state: state as FounderConfigurationStatus['state'],
    environment: requiredArray(record.environment, `${field}.environment`).map((item, index) => {
      const environment = requiredRecord(item, `${field}.environment[${index}]`);
      return {
        name: requiredString(environment.name, `${field}.environment[${index}].name`),
        present: requiredBoolean(environment.present, `${field}.environment[${index}].present`),
      };
    }),
  };
};

const parseHealthComponent = (value: unknown, index: number): FounderHealthComponent => {
  const record = requiredRecord(value, `components[${index}]`);
  const status = requiredString(record.status, `components[${index}].status`);
  if (!healthStatuses.has(status as FounderHealthStatus)) {
    throw new ApiClientError(`The Founder Control response contains an invalid components[${index}].status.`);
  }
  return {
    key: requiredString(record.key, `components[${index}].key`),
    label: requiredString(record.label, `components[${index}].label`),
    status: status as FounderHealthStatus,
    checkedAt: requiredString(record.checked_at, `components[${index}].checked_at`),
    latencyMs: nullableNumber(record.latency_ms, `components[${index}].latency_ms`),
    provider: nullableString(record.provider, `components[${index}].provider`),
    configuration: parseConfiguration(record.configuration, `components[${index}].configuration`),
    message: nullableString(record.message, `components[${index}].message`),
  };
};

const parseHealth = (value: unknown): FounderSystemHealth => {
  const record = requiredRecord(value, 'system health');
  return {
    generatedAt: requiredString(record.generated_at, 'generated_at'),
    components: requiredArray(record.components, 'components').map(parseHealthComponent),
  };
};

const parseFeed = (value: unknown, index: number): FounderDataFeed => {
  const record = requiredRecord(value, `feeds[${index}]`);
  const status = requiredString(record.status, `feeds[${index}].status`);
  const freshness = requiredString(record.freshness, `feeds[${index}].freshness`);
  if (!feedStatuses.has(status as FounderFeedStatus) || !feedFreshness.has(freshness as FounderFeedFreshness)) {
    throw new ApiClientError(`The Founder Control response contains an invalid feeds[${index}] status.`);
  }
  return {
    key: requiredString(record.key, `feeds[${index}].key`),
    label: requiredString(record.label, `feeds[${index}].label`),
    provider: nullableString(record.provider, `feeds[${index}].provider`),
    status: status as FounderFeedStatus,
    freshness: freshness as FounderFeedFreshness,
    lastUpdatedAt: nullableString(record.last_updated_at, `feeds[${index}].last_updated_at`),
    source: nullableString(record.source, `feeds[${index}].source`),
    enteredBy: nullableString(record.entered_by, `feeds[${index}].entered_by`),
    notes: nullableString(record.notes, `feeds[${index}].notes`),
    expiresAt: nullableString(record.expires_at, `feeds[${index}].expires_at`),
    errors: requiredArray(record.errors, `feeds[${index}].errors`).map((item, errorIndex) => {
      const error = requiredRecord(item, `feeds[${index}].errors[${errorIndex}]`);
      return {
        code: requiredString(error.code, `feeds[${index}].errors[${errorIndex}].code`),
        message: requiredString(error.message, `feeds[${index}].errors[${errorIndex}].message`),
      };
    }),
    configuration: parseConfiguration(record.configuration, `feeds[${index}].configuration`),
    manualEntrySupported: requiredBoolean(
      record.manual_entry_supported,
      `feeds[${index}].manual_entry_supported`,
    ),
  };
};

const parseFeeds = (value: unknown): FounderDataFeeds => {
  const record = requiredRecord(value, 'data feeds');
  return {
    generatedAt: requiredString(record.generated_at, 'generated_at'),
    feeds: requiredArray(record.feeds, 'feeds').map(parseFeed),
  };
};

const parseObservation = (value: unknown): ManualObservation => {
  const record = requiredRecord(value, 'manual observation');
  const status = requiredString(record.status, 'status');
  if (status !== 'manual') {
    throw new ApiClientError('The Founder Control response contains an invalid observation status.');
  }
  return {
    id: requiredString(record.id, 'id'),
    feedKey: requiredString(record.feed_key, 'feed_key'),
    status,
    source: requiredString(record.source, 'source'),
    observedAt: requiredString(record.observed_at, 'observed_at'),
    notes: nullableString(record.notes, 'notes'),
    expiresAt: nullableString(record.expires_at, 'expires_at'),
    enteredBy: requiredString(record.entered_by, 'entered_by'),
    correlationId: requiredString(record.correlation_id, 'correlation_id'),
    createdAt: requiredString(record.created_at, 'created_at'),
  };
};

export async function getFounderSystemHealth(): Promise<FounderSystemHealth> {
  return parseHealth(await apiClient<unknown>('/api/v1/admin/founder/system-health'));
}

export async function getFounderDataFeeds(): Promise<FounderDataFeeds> {
  return parseFeeds(await apiClient<unknown>('/api/v1/admin/founder/data-feeds'));
}

export async function createFounderDataFeedObservation(
  feedKey: string,
  input: ManualObservationInput,
): Promise<ManualObservation> {
  const source = input.source.trim();
  if (!source) throw new ApiClientError('A provenance source is required.');
  return parseObservation(await apiClient<unknown>(
    `/api/v1/admin/founder/data-feeds/${encodeURIComponent(feedKey)}/observations`,
    {
      method: 'POST',
      csrf: true,
      body: {
        source,
        observed_at: input.observedAt,
        notes: input.notes?.trim() || null,
        expires_at: input.expiresAt || null,
      },
    },
  ));
}

export type FounderCustomerSummary = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
  workspaceId: string | null;
};

export type FounderCustomerDetail = FounderCustomerSummary & {
  supportStatus: string;
  issueIndicators: string[];
  portfolioBalances: Array<{
    asset: string;
    authoritativeBalance: string;
    availableBalance: string;
    reservedBalance: string;
    pendingBalance: string;
  }>;
  withdrawalStatuses: string[];
};

export type FounderCircuitState = {
  workspaceId: string;
  state: 'enabled' | 'paused' | 'emergency_stop';
  reason: string | null;
  changedAt: string | null;
};

const parseCustomer = (value: unknown, field = 'customer'): FounderCustomerSummary => {
  const record = requiredRecord(value, field);
  return {
    id: requiredString(record.id, `${field}.id`),
    name: requiredString(record.name, `${field}.name`),
    email: requiredString(record.email, `${field}.email`),
    isActive: requiredBoolean(record.is_active, `${field}.is_active`),
    isVerified: requiredBoolean(record.is_verified, `${field}.is_verified`),
    roles: requiredArray(record.roles, `${field}.roles`).map((role, index) => requiredString(role, `${field}.roles[${index}]`)),
    createdAt: requiredString(record.created_at, `${field}.created_at`),
    lastLoginAt: nullableString(record.last_login_at, `${field}.last_login_at`),
    workspaceId: nullableString(record.workspace_id, `${field}.workspace_id`),
  };
};

export async function searchFounderCustomers(query: string): Promise<FounderCustomerSummary[]> {
  const payload = requiredArray(await apiClient<unknown>(`/api/v1/support/customers?q=${encodeURIComponent(query.trim())}`), 'customers');
  return payload.map((item, index) => parseCustomer(item, `customers[${index}]`));
}

export async function getFounderCustomer(userId: string): Promise<FounderCustomerDetail> {
  const record = requiredRecord(await apiClient<unknown>(`/api/v1/support/customers/${encodeURIComponent(userId)}`), 'customer detail');
  const summary = parseCustomer(record, 'customer detail');
  const balances = requiredArray(record.portfolio_balances, 'portfolio_balances').map((item, index) => {
    const balance = requiredRecord(item, `portfolio_balances[${index}]`);
    return {
      asset: requiredString(balance.asset, `portfolio_balances[${index}].asset`),
      authoritativeBalance: requiredString(balance.authoritative_balance, `portfolio_balances[${index}].authoritative_balance`),
      availableBalance: requiredString(balance.available_balance, `portfolio_balances[${index}].available_balance`),
      reservedBalance: requiredString(balance.reserved_balance, `portfolio_balances[${index}].reserved_balance`),
      pendingBalance: requiredString(balance.pending_balance, `portfolio_balances[${index}].pending_balance`),
    };
  });
  return {
    ...summary,
    supportStatus: requiredString(record.support_status, 'support_status'),
    issueIndicators: requiredArray(record.issue_indicators, 'issue_indicators').map((item, index) => requiredString(item, `issue_indicators[${index}]`)),
    portfolioBalances: balances,
    withdrawalStatuses: requiredArray(record.withdrawal_statuses, 'withdrawal_statuses').map((item, index) => requiredString(item, `withdrawal_statuses[${index}]`)),
  };
}

const parseCircuit = (value: unknown): FounderCircuitState => {
  const record = requiredRecord(value, 'circuit breaker');
  const state = requiredString(record.state, 'circuit breaker.state');
  if (!['enabled', 'paused', 'emergency_stop'].includes(state)) throw new ApiClientError('Invalid circuit breaker state.');
  return {
    workspaceId: requiredString(record.workspace_id, 'workspace_id'),
    state: state as FounderCircuitState['state'],
    reason: nullableString(record.reason, 'reason'),
    changedAt: nullableString(record.changed_at, 'changed_at'),
  };
};

export async function getFounderCircuit(workspaceId: string): Promise<FounderCircuitState> {
  return parseCircuit(await apiClient<unknown>(`/api/v1/withdrawals/operations/circuit/${encodeURIComponent(workspaceId)}`));
}

export async function setFounderCircuit(workspaceId: string, state: FounderCircuitState['state'], reason: string): Promise<FounderCircuitState> {
  return parseCircuit(await apiClient<unknown>(`/api/v1/withdrawals/operations/circuit/${encodeURIComponent(workspaceId)}`, {
    method: 'POST', csrf: true, body: { state, reason: reason.trim() || null },
  }));
}

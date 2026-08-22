import { ApiClientError, apiClient } from '@/lib/api-client';

export type PortfolioBalance = {
  asset: string;
  authoritativeBalance: string;
  availableBalance: string;
  reservedBalance: string;
  pendingBalance: string;
};

export type PortfolioPosition = {
  asset: string;
  quantity: string;
  averageCost: string | null;
  realizedPnl: string;
  unrealizedPnl: string;
};

export type PortfolioActivity = {
  id: string;
  transactionType: string;
  status: string;
  reference: string | null;
  source: string;
  createdAt: string;
  postedAt: string | null;
};

export type CustomerPortfolio = {
  portfolioId: string;
  workspaceId: string;
  userId: string;
  balances: PortfolioBalance[];
  positions: PortfolioPosition[];
  recentLedgerActivity: PortfolioActivity[];
};

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
);

const unwrap = (value: unknown): JsonRecord => {
  const record = asRecord(value);
  const data = asRecord(record?.data);
  return data ?? record ?? {};
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ApiClientError(`The portfolio response contains an invalid ${field}.`);
  }
  return value;
};

const nullableString = (value: unknown, field: string): string | null => {
  if (value === null) return null;
  return requiredString(value, field);
};

const requiredArray = (value: unknown, field: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new ApiClientError(`The portfolio response contains an invalid ${field}.`);
  }
  return value;
};

const parseBalance = (value: unknown, index: number): PortfolioBalance => {
  const record = asRecord(value);
  if (!record) throw new ApiClientError(`The portfolio response contains an invalid balances[${index}].`);
  return {
    asset: requiredString(record.asset, `balances[${index}].asset`),
    authoritativeBalance: requiredString(record.authoritative_balance, `balances[${index}].authoritative_balance`),
    availableBalance: requiredString(record.available_balance, `balances[${index}].available_balance`),
    reservedBalance: requiredString(record.reserved_balance, `balances[${index}].reserved_balance`),
    pendingBalance: requiredString(record.pending_balance, `balances[${index}].pending_balance`),
  };
};

const parsePosition = (value: unknown, index: number): PortfolioPosition => {
  const record = asRecord(value);
  if (!record) throw new ApiClientError(`The portfolio response contains an invalid positions[${index}].`);
  return {
    asset: requiredString(record.asset, `positions[${index}].asset`),
    quantity: requiredString(record.quantity, `positions[${index}].quantity`),
    averageCost: nullableString(record.average_cost, `positions[${index}].average_cost`),
    realizedPnl: requiredString(record.realized_pnl, `positions[${index}].realized_pnl`),
    unrealizedPnl: requiredString(record.unrealized_pnl, `positions[${index}].unrealized_pnl`),
  };
};

const parseActivity = (value: unknown, index: number): PortfolioActivity => {
  const record = asRecord(value);
  if (!record) throw new ApiClientError(`The portfolio response contains an invalid recent_ledger_activity[${index}].`);
  return {
    id: requiredString(record.id, `recent_ledger_activity[${index}].id`),
    transactionType: requiredString(record.transaction_type, `recent_ledger_activity[${index}].transaction_type`),
    status: requiredString(record.status, `recent_ledger_activity[${index}].status`),
    reference: nullableString(record.reference, `recent_ledger_activity[${index}].reference`),
    source: requiredString(record.source, `recent_ledger_activity[${index}].source`),
    createdAt: requiredString(record.created_at, `recent_ledger_activity[${index}].created_at`),
    postedAt: nullableString(record.posted_at, `recent_ledger_activity[${index}].posted_at`),
  };
};

const parsePortfolio = (payload: unknown): CustomerPortfolio => {
  const record = unwrap(payload);
  return {
    portfolioId: requiredString(record.portfolio_id, 'portfolio_id'),
    workspaceId: requiredString(record.workspace_id, 'workspace_id'),
    userId: requiredString(record.user_id, 'user_id'),
    balances: requiredArray(record.balances, 'balances').map(parseBalance),
    positions: requiredArray(record.positions, 'positions').map(parsePosition),
    recentLedgerActivity: requiredArray(record.recent_ledger_activity, 'recent_ledger_activity').map(parseActivity),
  };
};

export async function getCustomerPortfolio(): Promise<CustomerPortfolio> {
  return parsePortfolio(await apiClient<unknown>('/api/v1/portfolio'));
}

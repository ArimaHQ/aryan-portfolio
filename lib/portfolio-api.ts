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

export type FounderFinancialAccount = {
  id: string;
  asset: string;
  accountKind: string;
  status: string;
  balance: PortfolioBalance;
};

export type FounderFinancialState = {
  userId: string;
  workspaceId: string;
  portfolioId: string | null;
  financialAccounts: FounderFinancialAccount[];
  positions: PortfolioPosition[];
  ledgerActivityCount: number;
  settledTradeCount: number;
};

export type FounderTrade = {
  id: string;
  workspaceId: string;
  targetUserId: string;
  reversalOfId: string | null;
  side: string;
  baseAsset: string;
  quoteAsset: string;
  quantity: string;
  price: string;
  quoteValue: string;
  feeAsset: string;
  feeAmount: string;
  executedAt: string;
  status: string;
  externalExecutionId: string | null;
  reason: string;
  createdAt: string;
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

const parseFinancialAccount = (value: unknown, index: number): FounderFinancialAccount => {
  const record = asRecord(value);
  if (!record) throw new ApiClientError(`The financial-state response contains an invalid financial_accounts[${index}].`);
  return {
    id: requiredString(record.id, `financial_accounts[${index}].id`),
    asset: requiredString(record.asset, `financial_accounts[${index}].asset`),
    accountKind: requiredString(record.account_kind, `financial_accounts[${index}].account_kind`),
    status: requiredString(record.status, `financial_accounts[${index}].status`),
    balance: parseBalance(record.balance, index),
  };
};

const parseFinancialState = (payload: unknown): FounderFinancialState => {
  const record = unwrap(payload);
  const ledgerActivityCount = record.ledger_activity_count;
  const settledTradeCount = record.settled_trade_count;
  if (typeof ledgerActivityCount !== 'number' || !Number.isInteger(ledgerActivityCount) || ledgerActivityCount < 0) {
    throw new ApiClientError('The financial-state response contains an invalid ledger_activity_count.');
  }
  if (typeof settledTradeCount !== 'number' || !Number.isInteger(settledTradeCount) || settledTradeCount < 0) {
    throw new ApiClientError('The financial-state response contains an invalid settled_trade_count.');
  }
  return {
    userId: requiredString(record.user_id, 'user_id'),
    workspaceId: requiredString(record.workspace_id, 'workspace_id'),
    portfolioId: nullableString(record.portfolio_id, 'portfolio_id'),
    financialAccounts: requiredArray(record.financial_accounts, 'financial_accounts').map(parseFinancialAccount),
    positions: requiredArray(record.positions, 'positions').map(parsePosition),
    ledgerActivityCount,
    settledTradeCount,
  };
};

const parseTrade = (value: unknown, field = 'trade'): FounderTrade => {
  const record = asRecord(value);
  if (!record) throw new ApiClientError(`The trade response contains an invalid ${field}.`);
  return {
    id: requiredString(record.id, `${field}.id`),
    workspaceId: requiredString(record.workspace_id, `${field}.workspace_id`),
    targetUserId: requiredString(record.target_user_id, `${field}.target_user_id`),
    reversalOfId: nullableString(record.reversal_of_id, `${field}.reversal_of_id`),
    side: requiredString(record.side, `${field}.side`),
    baseAsset: requiredString(record.base_asset, `${field}.base_asset`),
    quoteAsset: requiredString(record.quote_asset, `${field}.quote_asset`),
    quantity: requiredString(record.quantity, `${field}.quantity`),
    price: requiredString(record.price, `${field}.price`),
    quoteValue: requiredString(record.quote_value, `${field}.quote_value`),
    feeAsset: requiredString(record.fee_asset, `${field}.fee_asset`),
    feeAmount: requiredString(record.fee_amount, `${field}.fee_amount`),
    executedAt: requiredString(record.executed_at, `${field}.executed_at`),
    status: requiredString(record.status, `${field}.status`),
    externalExecutionId: nullableString(record.external_execution_id, `${field}.external_execution_id`),
    reason: requiredString(record.reason, `${field}.reason`),
    createdAt: requiredString(record.created_at, `${field}.created_at`),
  };
};

export async function getCustomerPortfolio(): Promise<CustomerPortfolio> {
  return parsePortfolio(await apiClient<unknown>('/api/v1/portfolio'));
}

export async function getFounderCustomerPortfolio(userId: string): Promise<CustomerPortfolio> {
  return parsePortfolio(await apiClient<unknown>(
    `/api/v1/portfolio/operations/customers/${encodeURIComponent(userId)}`,
  ));
}

export async function getFounderCustomerFinancialState(userId: string): Promise<FounderFinancialState> {
  return parseFinancialState(await apiClient<unknown>(
    `/api/v1/portfolio/operations/customers/${encodeURIComponent(userId)}/financial-state`,
  ));
}

export type FounderTradeInput = {
  side: 'buy' | 'sell';
  base_asset: 'BTC' | 'ETH';
  quote_asset: 'USD';
  quantity: string;
  price: string;
  fee_amount: string;
  executed_at: string;
  reason: string;
  idempotency_key: string;
  external_execution_id?: string;
};

export async function getFounderCustomerTrades(userId: string): Promise<FounderTrade[]> {
  const payload = await apiClient<unknown>(`/api/v1/portfolio/operations/customers/${encodeURIComponent(userId)}/trades`);
  return requiredArray(payload, 'trades').map((item, index) => parseTrade(item, `trades[${index}]`));
}

export async function recordFounderCustomerTrade(userId: string, input: FounderTradeInput): Promise<FounderTrade> {
  return parseTrade(await apiClient<unknown>(
    `/api/v1/portfolio/operations/customers/${encodeURIComponent(userId)}/trades`,
    { method: 'POST', body: input },
  ));
}

export async function reverseFounderCustomerTrade(userId: string, tradeId: string, reason: string, idempotencyKey: string): Promise<FounderTrade> {
  return parseTrade(await apiClient<unknown>(
    `/api/v1/portfolio/operations/customers/${encodeURIComponent(userId)}/trades/${encodeURIComponent(tradeId)}/reverse`,
    { method: 'POST', body: { reason, idempotency_key: idempotencyKey } },
  ));
}

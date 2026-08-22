import { ApiClientError, apiClient } from '@/lib/api-client';

export type WorkspaceDashboardSummary = {
  provenance: {
    source: 'server_persisted';
    recordType: 'workspace';
    workspaceId: string | null;
  };
  totalProjects: number;
  activeProjects: number;
  archivedProjects: number;
  projectsByStatus: Record<string, number>;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  completedTasks: number;
  overdueTasks: number;
  unassignedTasks: number;
  completionRate: number;
  overdueRate: number;
  averageCompletionTimeHours: number;
  tasksDueNext7Days: number;
  tasksDueNext30Days: number;
  activeUsers: number;
  recentActivityCount: number;
  generatedAt: string;
  rangeStart: string;
  rangeEnd: string;
};

const requiredNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ApiClientError(`The dashboard response contains an invalid ${field}.`);
  }
  return value;
};

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value) {
    throw new ApiClientError(`The dashboard response contains an invalid ${field}.`);
  }
  return value;
};

const nullableString = (value: unknown, field: string) => {
  if (value === null) return null;
  return requiredString(value, field);
};

const requiredRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiClientError(`The dashboard response contains an invalid ${field}.`);
  }
  return value as Record<string, unknown>;
};

const requiredLiteral = <T extends string>(value: unknown, expected: T, field: string): T => {
  if (value !== expected) {
    throw new ApiClientError(`The dashboard response contains an invalid ${field}.`);
  }
  return expected;
};

const countMap = (value: unknown, field: string): Record<string, number> => {
  const record = value as Record<string, unknown> | null;
  if (!record) {
    throw new ApiClientError(`The dashboard response contains an invalid ${field}.`);
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, count]) => [
      key,
      requiredNumber(count, `${field}.${key}`),
    ]),
  );
};

const unwrap = (value: unknown): Record<string, unknown> => {
  const record = value as Record<string, unknown> | null;
  if (!record) {
    throw new ApiClientError('The dashboard service returned an invalid response.');
  }
  const data = record.data as Record<string, unknown> | null;
  return data ?? record;
};

const parseDashboardSummary = (payload: unknown): WorkspaceDashboardSummary => {
  const record = unwrap(payload);
  const provenance = requiredRecord(record.provenance, 'provenance');
  return {
    provenance: {
      source: requiredLiteral(provenance.source, 'server_persisted', 'provenance.source'),
      recordType: requiredLiteral(provenance.record_type, 'workspace', 'provenance.record_type'),
      workspaceId: nullableString(provenance.workspace_id, 'provenance.workspace_id'),
    },
    totalProjects: requiredNumber(record.total_projects, 'total_projects'),
    activeProjects: requiredNumber(record.active_projects, 'active_projects'),
    archivedProjects: requiredNumber(record.archived_projects, 'archived_projects'),
    projectsByStatus: countMap(record.projects_by_status, 'projects_by_status'),
    totalTasks: requiredNumber(record.total_tasks, 'total_tasks'),
    tasksByStatus: countMap(record.tasks_by_status, 'tasks_by_status'),
    completedTasks: requiredNumber(record.completed_tasks, 'completed_tasks'),
    overdueTasks: requiredNumber(record.overdue_tasks, 'overdue_tasks'),
    unassignedTasks: requiredNumber(record.unassigned_tasks, 'unassigned_tasks'),
    completionRate: requiredNumber(record.completion_rate, 'completion_rate'),
    overdueRate: requiredNumber(record.overdue_rate, 'overdue_rate'),
    averageCompletionTimeHours: requiredNumber(
      record.average_completion_time_hours,
      'average_completion_time_hours',
    ),
    tasksDueNext7Days: requiredNumber(record.tasks_due_next_7_days, 'tasks_due_next_7_days'),
    tasksDueNext30Days: requiredNumber(record.tasks_due_next_30_days, 'tasks_due_next_30_days'),
    activeUsers: requiredNumber(record.active_users, 'active_users'),
    recentActivityCount: requiredNumber(record.recent_activity_count, 'recent_activity_count'),
    generatedAt: requiredString(record.generated_at, 'generated_at'),
    rangeStart: requiredString(record.range_start, 'range_start'),
    rangeEnd: requiredString(record.range_end, 'range_end'),
  };
};

export async function getWorkspaceDashboardSummary(): Promise<WorkspaceDashboardSummary> {
  try {
    const payload = await apiClient<unknown>('/api/v1/dashboard/summary', {
      method: 'GET',
    });
    return parseDashboardSummary(payload);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error) {
      if (error.message.includes('timed out') || error.message.includes('Unable to reach')) {
        throw new ApiClientError('Unable to reach the dashboard service. Please try again.');
      }
      throw error;
    }
    throw new ApiClientError('Unable to load your workspace dashboard.');
  }
}

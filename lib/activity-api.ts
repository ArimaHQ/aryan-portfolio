import { apiClient } from '@/lib/api-client';

export type ActivityResponse = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  timestamp: string;
  summary: string;
  metadata: Record<string, string | string | null>;
};

export type ActivityListResponse = {
  items: ActivityResponse[];
  total: number;
  limit: number;
  offset: number;
};

export async function listActivities(params: {
  actor_id?: string | null;
  entity?: string | null;
  action?: string | null;
  project_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ActivityListResponse> {
  const query = new URLSearchParams();
  if (params.actor_id) query.set('actor_id', params.actor_id);
  if (params.entity) query.set('entity', params.entity);
  if (params.action) query.set('action', params.action);
  if (params.project_id) query.set('project_id', params.project_id);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const path = qs ? `/api/v1/activity?${qs}` : '/api/v1/activity';

  return apiClient<ActivityListResponse>(path, { method: 'GET' });
}

import { apiClient } from '@/lib/api-client';

export type TaskResponse = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  project_id: string;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TaskListResponse = {
  items: TaskResponse[];
  total: number;
  limit: number;
  offset: number;
};

export type TaskCreate = {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assigned_to?: string | null;
  project_id: string;
  due_date?: string | null;
};

export type TaskUpdate = {
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  assigned_to?: string | null;
  project_id?: string | null;
  due_date?: string | null;
};

export async function listTasks(params: {
  status?: string | null;
  priority?: string | null;
  project?: string | null;
  assigned_to?: string | null;
  overdue?: boolean | null;
  completed?: boolean | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<TaskListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.priority) query.set('priority', params.priority);
  if (params.project) query.set('project', params.project);
  if (params.assigned_to) query.set('assigned_to', params.assigned_to);
  if (params.overdue !== undefined && params.overdue !== null) query.set('overdue', String(params.overdue));
  if (params.completed !== undefined && params.completed !== null) query.set('completed', String(params.completed));
  if (params.search) query.set('search', params.search);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const path = qs ? `/api/v1/tasks?${qs}` : '/api/v1/tasks';

  return apiClient<TaskListResponse>(path, { method: 'GET' });
}

export async function getTask(taskId: string): Promise<TaskResponse> {
  return apiClient<TaskResponse>(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'GET',
  });
}

export async function createTask(data: TaskCreate): Promise<TaskResponse> {
  return apiClient<TaskResponse>('/api/v1/tasks', {
    method: 'POST',
    csrf: true,
    body: data,
  });
}

export async function updateTask(taskId: string, data: TaskUpdate): Promise<TaskResponse> {
  return apiClient<TaskResponse>(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    csrf: true,
    body: data,
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient<void>(`/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
    csrf: true,
  });
}

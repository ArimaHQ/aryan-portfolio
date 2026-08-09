import { apiClient } from '@/lib/api-client';

export type ProjectResponse = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  owner_id: string;
  created_by: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectListResponse = {
  items: ProjectResponse[];
  total: number;
  limit: number;
  offset: number;
};

export type ProjectCreate = {
  name: string;
  description?: string | null;
  status?: string;
  owner_id?: string | null;
};

export type ProjectUpdate = {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  owner_id?: string | null;
};

export async function listProjects(params: {
  status?: string | null;
  owner?: string | null;
  created_by?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}): Promise<ProjectListResponse> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.owner) query.set('owner', params.owner);
  if (params.created_by) query.set('created_by', params.created_by);
  if (params.search) query.set('search', params.search);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const path = qs ? `/api/v1/projects?${qs}` : '/api/v1/projects';

  return apiClient<ProjectListResponse>(path, { method: 'GET' });
}

export async function getProject(projectId: string): Promise<ProjectResponse> {
  return apiClient<ProjectResponse>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'GET',
  });
}

export async function createProject(data: ProjectCreate): Promise<ProjectResponse> {
  return apiClient<ProjectResponse>('/api/v1/projects', {
    method: 'POST',
    csrf: true,
    body: data,
  });
}

export async function updateProject(
  projectId: string,
  data: ProjectUpdate,
): Promise<ProjectResponse> {
  return apiClient<ProjectResponse>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    csrf: true,
    body: data,
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient<void>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
    csrf: true,
  });
}

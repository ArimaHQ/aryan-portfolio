import { apiClient } from '@/lib/api-client';

export type NotificationResponse = {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
};

export type NotificationListResponse = {
  items: NotificationResponse[];
  total: number;
  limit: number;
  offset: number;
};

export type UnreadCountResponse = {
  unread_count: number;
};

export type ReadAllResponse = {
  updated_count: number;
};

export async function listNotifications(params: {
  is_read?: boolean | null;
  type?: string | null;
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const query = new URLSearchParams();
  if (params.is_read !== undefined && params.is_read !== null) {
    query.set('is_read', String(params.is_read));
  }
  if (params.type) query.set('type', params.type);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const qs = query.toString();
  const path = qs ? `/api/v1/notifications?${qs}` : '/api/v1/notifications';

  return apiClient<NotificationListResponse>(path, { method: 'GET' });
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return apiClient<UnreadCountResponse>('/api/v1/notifications/unread-count', { method: 'GET' });
}

export async function markNotificationRead(notificationId: string): Promise<NotificationResponse> {
  return apiClient<NotificationResponse>(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    csrf: true,
  });
}

export async function markAllNotificationsRead(): Promise<ReadAllResponse> {
  return apiClient<ReadAllResponse>('/api/v1/notifications/read-all', {
    method: 'POST',
    csrf: true,
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient<void>(`/api/v1/notifications/${encodeURIComponent(notificationId)}`, {
    method: 'DELETE',
    csrf: true,
  });
}

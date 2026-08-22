import { ApiClientError, apiClient } from '@/lib/api-client';

async function fetchJSON<T>(path: string): Promise<T> {
  try {
    const payload = await apiClient<unknown>(path, { method: 'GET' });
    return payload as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error) {
      if (error.message.includes('timed out') || error.message.includes('Unable to reach')) {
        throw new ApiClientError('Unable to reach the intelligence service. Please try again.');
      }
      throw error;
    }
    throw new ApiClientError('Unable to load intelligence data.');
  }
}

export type NewsItem = {
  id: number;
  title: string;
  summary: string;
  source: string;
  category: string;
  impact: string;
  sentiment: string;
  published_at: string;
};

export type EconomicEvent = {
  id: number;
  event_name: string;
  country: string;
  importance: string;
  forecast: number | null;
  previous: number | null;
  event_time: string;
};

export const getLatestNews = () =>
  fetchJSON<NewsItem[]>('/api/v1/news/latest');

export const getEconomicEvents = () =>
  fetchJSON<EconomicEvent[]>('/api/v1/economic/events');

import { apiClient } from '@/lib/api-client';

const WORKSPACE_ID = '3fe88ccc-5aca-429f-8a83-ee550e266b49';
const EXECUTIVE_ASSISTANT_ID = 'fbff7974-b68f-482d-a9c0-52004a768360';

export async function grantExecutiveAssistant(): Promise<void> {
  await apiClient<unknown>(
    `/api/v1/admin/founder/workspaces/${WORKSPACE_ID}/agents/${EXECUTIVE_ASSISTANT_ID}/grant`,
    { method: 'POST' },
  );
}

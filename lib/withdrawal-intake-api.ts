import { apiClient } from '@/lib/api-client';

export type WithdrawalIntakeInput = {
  full_name: string;
  amount_eth: string;
  wallet_address: string;
  network: 'Ethereum Mainnet';
  note?: string;
};

export type WithdrawalIntakeResponse = {
  message: string;
};

export function submitWithdrawalIntake(input: WithdrawalIntakeInput) {
  return apiClient<WithdrawalIntakeResponse>('/api/v1/requests/withdrawal-intake', {
    method: 'POST',
    body: input,
  });
}

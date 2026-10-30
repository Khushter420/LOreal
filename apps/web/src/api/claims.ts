import type { AssessClaimRequest, AssessmentResult } from '../types';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function assessClaim(
  payload: AssessClaimRequest,
): Promise<AssessmentResult> {
  const response = await fetch(`${apiBaseUrl}/claims/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(125000),
  });

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('Please check the claim and evidence lengths and try again.');
    }
    if (response.status === 503) {
      throw new Error('The assessment service is unavailable. Please try again shortly.');
    }
    throw new Error('Assessment could not be completed. Please try again.');
  }

  return response.json() as Promise<AssessmentResult>;
}

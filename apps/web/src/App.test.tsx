import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const result = {
  claimId: 'claim-1',
  assessmentId: 'assessment-1',
  justified: false,
  status: 'NOT_JUSTIFIED' as const,
  confidence: 0.93,
  reasoning: 'Observed reduction was below the claimed amount.',
};

describe('claim assessment experience', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => result,
    }));
  });

  it('renders accessible fields and disables submit until both are filled', () => {
    render(<App />);
    expect(screen.getByLabelText('Proposed cosmetic claim')).toBeInTheDocument();
    expect(screen.getByLabelText('Clinical evidence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assess claim/i })).toBeDisabled();
  });

  it('sends the entered claim and evidence and displays the assessment', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Proposed cosmetic claim'), {
      target: { value: 'Reduces wrinkles by 20% in 4 weeks' },
    });
    fireEvent.change(screen.getByLabelText('Clinical evidence'), {
      target: { value: '100 participants showed a 12% reduction in 4 weeks.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /assess claim/i }));

    await waitFor(() => expect(screen.getByText('No, not established')).toBeInTheDocument());
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api';
    expect(fetch).toHaveBeenCalledWith(`${apiBaseUrl}/claims/assess`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        claim: 'Reduces wrinkles by 20% in 4 weeks',
        evidence: '100 participants showed a 12% reduction in 4 weeks.',
      }),
    }));
    expect(screen.getByText('Observed reduction was below the claimed amount.')).toBeInTheDocument();
    expect(screen.getByText(/not statistical certainty/i)).toHaveTextContent('93%');
  });

  it('shows provider errors and re-enables submission', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    render(<App />);
    fireEvent.change(screen.getByLabelText('Proposed cosmetic claim'), { target: { value: 'Reduces wrinkles by 20% in 4 weeks' } });
    fireEvent.change(screen.getByLabelText('Clinical evidence'), { target: { value: 'A study with enough words to meet the minimum input size.' } });
    fireEvent.click(screen.getByRole('button', { name: /assess claim/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/service is unavailable/i);
    expect(screen.getByRole('button', { name: /assess claim/i })).toBeEnabled();
  });

  it('distinguishes insufficient evidence from a negative assessment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...result, status: 'INSUFFICIENT_EVIDENCE', reasoning: 'Study duration is missing.' }),
    }));
    render(<App />);
    fireEvent.change(screen.getByLabelText('Proposed cosmetic claim'), { target: { value: 'Reduces wrinkles by 20% in 4 weeks' } });
    fireEvent.change(screen.getByLabelText('Clinical evidence'), { target: { value: 'A study with enough words to meet the minimum input size.' } });
    fireEvent.click(screen.getByRole('button', { name: /assess claim/i }));
    expect(await screen.findByText('Insufficient evidence')).toBeInTheDocument();
    expect(screen.getByText('Study duration is missing.')).toBeInTheDocument();
  });

  it('clears stale results when a later network request fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => result })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    const claimField = screen.getByLabelText('Proposed cosmetic claim');
    const evidenceField = screen.getByLabelText('Clinical evidence');
    fireEvent.change(claimField, { target: { value: 'Reduces wrinkles by 20% in 4 weeks' } });
    fireEvent.change(evidenceField, { target: { value: 'A study with enough words to meet the minimum input size.' } });
    fireEvent.click(screen.getByRole('button', { name: /assess claim/i }));
    expect(await screen.findByText('No, not established')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /assess claim/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch');
    expect(screen.queryByText('No, not established')).not.toBeInTheDocument();
  });
});

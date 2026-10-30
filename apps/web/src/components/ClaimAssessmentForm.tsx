import { useState, type FormEvent } from 'react';
import { assessClaim } from '../api/claims';
import type { AssessmentResult } from '../types';

interface Props {
  onStart: () => void;
  onSuccess: (result: AssessmentResult) => void;
}

export function ClaimAssessmentForm({ onStart, onSuccess }: Props) {
  const [claim, setClaim] = useState('');
  const [evidence, setEvidence] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = claim.trim().length > 0 && evidence.trim().length > 0 && !pending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    setError('');
    onStart();
    try {
      onSuccess(await assessClaim({ claim: claim.trim(), evidence: evidence.trim() }));
    } catch (caught) {
      setError(
        caught instanceof Error && caught.name === 'TimeoutError'
          ? 'The assessment timed out. Please try again.'
          : caught instanceof Error
            ? caught.message
            : 'Assessment could not be completed. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="assessment-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="claim">Proposed cosmetic claim</label>
        <textarea
          id="claim"
          value={claim}
          onChange={(event) => setClaim(event.target.value)}
          placeholder="e.g. Reduces the appearance of wrinkles by 20% in 4 weeks"
          minLength={10}
          maxLength={500}
          required
          rows={3}
        />
        <span className="field-hint">10–500 characters</span>
      </div>
      <div className="field">
        <label htmlFor="evidence">Clinical evidence</label>
        <textarea
          id="evidence"
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          placeholder="Paste a plain-text summary of the study, including endpoint, duration and population"
          minLength={20}
          maxLength={20000}
          required
          rows={6}
        />
        <span className="field-hint">Plain text only · 20–20,000 characters · Do not enter personal or patient data</span>
      </div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <button type="submit" disabled={!canSubmit}>
        {pending ? (
          <>
            <span className="spinner" aria-hidden="true" /> Assessing evidence…
          </>
        ) : (
          <>Assess claim <span aria-hidden="true">→</span></>
        )}
      </button>
      <p className="form-note">AI analysis is advisory and does not constitute regulatory or scientific approval.</p>
    </form>
  );
}

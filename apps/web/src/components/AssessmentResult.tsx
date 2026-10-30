import type { AssessmentResult as Result } from '../types';

interface Props {
  result: Result;
}

const statusLabels = {
  JUSTIFIED: 'Justified',
  NOT_JUSTIFIED: 'Not justified',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
} as const;

export function AssessmentResult({ result }: Props) {
  return (
    <section className="result-card" aria-labelledby="result-heading" aria-live="polite">
      <div className={`result-mark ${result.justified ? 'positive' : 'negative'}`} aria-hidden="true">
        {result.justified ? '✓' : '×'}
      </div>
      <div className="result-copy">
        <p className="eyebrow">Assessment outcome</p>
        <h2 id="result-heading">
          {result.justified ? 'Yes, supported' : 'No, not established'}
        </h2>
        <span className={`status-pill status-${result.status.toLowerCase()}`}>
          {statusLabels[result.status]}
        </span>
        <p className="reasoning">{result.reasoning}</p>
        <p className="confidence">
          AI assessment confidence — not statistical certainty:{' '}
          <strong>{Math.round(result.confidence * 100)}%</strong>
        </p>
        <p className="disclaimer">
          Decision support only. A qualified human reviewer makes the final approval decision.
        </p>
      </div>
    </section>
  );
}

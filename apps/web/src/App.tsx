import { useState } from 'react';
import { AssessmentResult } from './components/AssessmentResult';
import { ClaimAssessmentForm } from './components/ClaimAssessmentForm';
import type { AssessmentResult as Result } from './types';

export default function App() {
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);

  function handleSuccess(nextResult: Result) {
    setResult(nextResult);
    setHistory((previous) => [nextResult, ...previous].slice(0, 5));
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="L'Oréal Claims Intelligence home">
          L’ORÉAL <span>·</span> CLAIMS INTELLIGENCE
        </a>
        <span className="topbar-note">INTERNAL DECISION SUPPORT</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Evidence-led claim review</p>
          <h1>Make every claim<br /><em>count.</em></h1>
          <p className="intro">
            Compare a proposed cosmetic claim with its clinical evidence. Surface gaps and
            contradictions before a human reviewer makes the final call.
          </p>
        </div>
        <div className="hero-aside" aria-label="Assessment workflow">
          <span className="step-number">01 / 03</span>
          <p>Claim</p><span className="step-line" />
          <p className="step-active">Evidence</p><span className="step-line" />
          <p>Human review</p>
        </div>
      </section>

      <section className="workspace" aria-label="Claim assessment workspace">
        <div className="form-panel">
          <div className="section-heading">
            <span className="section-index">01</span>
            <div>
              <h2>Submit for assessment</h2>
              <p>Include the exact claim and a plain-text summary of the supporting study.</p>
            </div>
          </div>
          <ClaimAssessmentForm onStart={() => setResult(null)} onSuccess={handleSuccess} />
        </div>

        <div className="results-panel">
          {result ? (
            <AssessmentResult result={result} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">✳</div>
              <p className="eyebrow">Your assessment</p>
              <h2>Clarity starts<br />with evidence.</h2>
              <p>Submit a claim and its clinical evidence to see a reasoned assessment here.</p>
            </div>
          )}
          {history.length > 1 && (
            <aside className="history" aria-label="Recent assessments">
              <h3>Recent assessments</h3>
              <ul>
                {history.slice(1).map((item) => (
                  <li key={item.assessmentId}>
                    <span>{item.status.replaceAll('_', ' ')}</span>
                    <span>{Math.round(item.confidence * 100)}% confidence</span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </section>
      <footer>
        <span>Claims Intelligence Engine · MVP</span>
        <span>Human judgment remains the final authority.</span>
      </footer>
    </main>
  );
}

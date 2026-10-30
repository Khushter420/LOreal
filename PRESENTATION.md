# Claims Intelligence Engine — 10-minute walkthrough

## Run the demo

Run API and web using the setup commands in [README.md](./README.md). The current MVP stores claims under `apps/api/data/claims.json` and does not require PostgreSQL. Configure an authorized development API key, or demonstrate the deterministic API/UI tests without making an external model call. Use only synthetic text.

## Timed flow

### 0:00–1:00 — Business problem and users

Claims managers, formulation scientists, clinical evaluators, and human reviewers need to connect an exact consumer-facing claim to evidence. The example claim promises a 20% wrinkle reduction in four weeks; evidence reports 12%. The system gives reviewers a quick, traceable decision-support assessment rather than an approval.

### 1:00–3:00 — Architecture and rationale

Walk from React form to NestJS validation, orchestration, AI adapter, strict response validation, Prisma, and PostgreSQL. React owns interaction; NestJS DI makes provider and persistence replaceable/testable; PostgreSQL preserves related evidence and assessment history. The synchronous design is intentionally small; use a queue for long-running/production workloads.

### 3:00–5:00 — Data and API

Show the JSON-file claim and one-to-many assessment history and `POST /api/claims/assess`. Explain that Prisma schema/migration remain in the project for a future PostgreSQL switch. Explain the three statuses: `JUSTIFIED`, `NOT_JUSTIFIED`, and `INSUFFICIENT_EVIDENCE`. Only the first gives `justified: true`. Show that confidence is an uncalibrated model estimate—not a probability of approval or statistical interval. `GET /api/claims/:id` reads saved assessment history.

### 5:00–7:00 — Demo: contradiction and uncertainty

1. Submit synthetic claim “Reduces wrinkles by 20% in 4 weeks.”
2. Submit “100 participants showed a 12% wrinkle reduction in 4 weeks.” The explicit same-duration numeric guardrail prevents a justified result, even if the model overstates support.
3. Submit a synthetic evidence summary that lacks duration, endpoint, or sample details. The desired status is `INSUFFICIENT_EVIDENCE`, with missing support explained.
4. Show the reviewer caveat, confidence label, and recent in-session results.

### 7:00–8:00 — Tests and failure behavior

Show `npm test`: provider and persistence are mocked for deterministic unit tests; HTTP validation/route wiring and the UI happy/error path are covered. Missing credentials produce 503, invalid input 400, provider output is schema-checked, and DB failure is not presented as success. Report only tests actually run; DB integration and live provider tests require those dependencies.

### 8:00–10:00 — Trade-offs, safety, and roadmap

Structured output controls shape, not truth. The model can hallucinate; reviewers need evidence citations and independent study validity checks. Inputs should be synthetic during development; no patient data should be sent to a provider. Confidence is uncalibrated. Next: structured study metadata and evidence citations, PDF extraction with verification, formal human approval/audit, access controls, model evaluations/calibration, and async jobs.

## Anticipated panel questions

- **Why an LLM rather than rules alone?** It can summarize nuanced evidence and explain limitations; deterministic checks remain valuable for obvious contradictions. Neither replaces scientific review.
- **What does confidence mean?** An uncalibrated model estimate only. It is not a p-value, confidence interval, or approval probability.
- **How are hallucinations controlled?** Treat evidence as untrusted input, require constrained JSON, validate values, ask for insufficiency when facts are missing, retain a narrow numeric guardrail, and keep a human decision-maker. None guarantees factual correctness.
- **Can the tool validate study validity?** Not comprehensively. It surfaces missing information; domain experts and validated review protocols remain required.
- **What happens when the model fails?** A generic 503; no assessment is persisted. An invalid provider result is rejected.
- **How does this scale?** Add a queue/worker, idempotency, rate limits, retries, observability, and operational review; avoid adding distributed infrastructure before needed.
- **Why keep a relational schema?** Claims can have multiple independent assessments. File storage is temporary local-MVP persistence; the preserved Prisma model supports the later PostgreSQL migration to a more durable, queryable backend.
- **How is the key secured?** Server environment only; `.env` ignored; never embedded in Vite/browser output.
- **How would PDF ingestion work?** Add secure upload and malware checks, extract text, preserve page/paragraph provenance, and require source validation before assessment.
- **How can it be tested without API access?** Mock the injected AI service and Prisma client; the automated unit/HTTP/UI tests use deterministic fixtures.

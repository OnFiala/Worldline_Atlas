# Evidence and version contracts

A payload accepted by the API is not automatically reliable evidence. These contracts are research rules as well as software interfaces. The included examples are synthetic.

## Record kinds

- source: publication title, HTTPS URL, origin family, publication date, measurement period, access scope and a record of what was actually read.
- event: a dated observation or attributed claim, region, representative coordinates, source references, limits and the exact claim under review.
- node: a named place, sector, system or concept; its existence does not prove its outgoing links.
- relation: a conditional mechanism with direction, lag, conditions, indicators, alternatives, counterevidence and confirmation/refutation rules.
- prediction: an expectation with an original issuance time, frozen target interval and outcome rule. Probability may be null.

Distinguish observations, attributed claims, model estimates, hypotheses, analogies and forecasts. Two supported endpoints do not prove their connecting edge. Market mechanisms are research hypotheses, not trading advice.

## Time and measurement

Keep event time, measurement window, publication date, retrieval/check time, forecast input cutoff, issuance time, relationship validity and server storage time separate. Each numeric claim needs a metric, unit, region/population, observation period and source. Unknown stays null with a reason; opening an old paper today does not make its measurements current.

## Evidence gate

Normally two independently originating source families must support the exact event claim and period. Reprints and mirrors count as one family. An authoritative measurement or official decision can instead have one primary origin and an independent authenticity, context and interpretation review; that is not two measurements.

Accepted reading scopes are full_text, relevant_body or dataset. readEvidence records verifier, readAt, locator and a concise support summary. Unknown access, snippets, headlines, blocked pages and supplied notes cannot establish an unseen body. Reviews bind to the source version; a later source revision requires renewed claim review. Unqualified events stay in the watchlist. Relations with withdrawn or contested current sources expose a review-needed annotation.

These are accountable declarations. The API checks their presence, exact claim strings and source identities, not whether a human actually read a document or whether the reasoning is sound. Keep source notes and links; do not archive whole third-party articles.

## Imports and history

An import contains run and records. Each record contains kind, id, expectedVersion and data. A new identity uses expectedVersion 0; the next stored version is expectedVersion + 1. Existing versions are not overwritten. The API accepts up to 150 records and 700,000 request characters, with smaller per-record limits. Each accepted batch is atomic; several batches are not one transaction.

A unique run ID binds to the SHA-256 of the exact serialized request. Retrying the same bytes is idempotent; a changed body needs a deliberate new run ID. A version conflict requires a fresh read and reconciliation. Failed runs carry no records and leave the last successful dataset intact. Rejection auditing is best effort and may fail when storage is unavailable. Unauthorized requests are rejected before database writes.

The server must authenticate a writer before calling the API with WRITE_AUTHORIZED: true. The JSON writerRole is only a declared scope: integrator, or evaluator restricted to existing predictions. The local demo exposes no HTTP writer.

## Frozen predictions

Freeze statement, issuance, probability/basis, target dates, decision source, baseline, threshold and resolution criteria before the outcome. A material change gets a new ID with an explicit predecessor reference. Evaluation can append status, outcome, resolution evidence, decision, scores and lessons; it cannot rewrite the original expectation.

Resolution requires the target period to have ended, actual evidence, a dated decision matching the original criterion, and the specified decision source when one was frozen. Missing or ambiguous evidence is not success. The API recomputes binary Brier error and continuous absolute error from eligible outcomes; recorded fields do not prove source interpretation.

Brier error is (probability - outcome)^2. Skill uses the same cases and a preselected baseline. Continuous errors must share metric and unit; calibration comparisons must retain domain, horizon, vintage and sample counts. Unresolved examples never count as successful predictions. The UI shows insufficient resolved forecasts instead of inventing an accuracy history.

## Bounded work

Keep at most three active prospective tests and ten queued candidates. Before activation, define indicators, comparison, decision source, threshold, horizon and next review. A larger conditional mechanism library is allowed, but it is not an unlimited set of active forecasts. No researcher, evaluator or model-routing schedule is implemented in this repository.

# Scenario: P-02 — Phase 3.7 contains three labeled sub-steps plus index generation

## Type
feature

## Priority
critical — AC-2 explicitly requires three labeled sub-sections. Tests must enforce their presence by name. Index generation is a required post-write step for FR-17b.

## Preconditions
- Updated `.claude/agents/onboard-agent.md` with Phase 3.7 written.
- Mirror copy in `plugins/dark-factory/agents/onboard-agent.md`.

## Action
Structural test asserts that `.claude/agents/onboard-agent.md` contains ALL of the following substrings:
- `3.7a Invariants Extraction` (or `3.7a: Invariants Extraction`)
- `3.7b Decisions Seeding` (or `3.7b: Decisions Seeding`)
- `3.7c Ledger Retro-Backfill` (or `3.7c: Ledger Retro-Backfill`)
- A reference to `index.md` generation as a post-write step within Phase 3.7 (e.g., `generate index.md`, `write index`, or equivalent phrase within the Phase 3.7 body)

And that the three sub-step labels appear within the Phase 3.7 section body (i.e., after the `### Phase 3.7: Memory Extraction` heading and before the next `### Phase` heading).

## Expected Outcome
- All three sub-step labels present and inside Phase 3.7.
- Order within Phase 3.7: 3.7a → 3.7b → 3.7c (ascending sub-letter).
- Index generation is mentioned within Phase 3.7 or Phase 7 Memory Sign-Off as a post-write step.
- Mirror file passes the same assertions.

## Failure Mode (if applicable)
If any sub-step is missing or out of order, the test must name the missing/misplaced label. If index generation is not referenced, test names that gap.

## Notes
Matching is case-sensitive on the labels `3.7a`, `3.7b`, `3.7c`. The descriptive suffix (`Invariants Extraction`, etc.) is a fixed phrase used for discoverability. Index generation is not a numbered sub-step (3.7a/b/c) but must appear in the phase body as a documented step.

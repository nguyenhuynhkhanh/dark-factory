# Scenario: Medium scope spec gets single architect round

## Type
feature

## Priority
critical -- validates the medium tier routing

## Preconditions
- A feature spec exists with Implementation Size Estimate: `Scope size: medium`, `Estimated file count: 4`
- The spec does not touch any always-review patterns
- Public and holdout scenarios exist

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The orchestrator identifies scope as `medium`
- Exactly ONE architect-agent is spawned (not three parallel)
- The single architect-agent reviews all domains (security, architecture, API) in one pass
- The architect-agent produces a single `test-feature.review.md` (standard format)
- No domain-specific review files are created (`review-security.md`, etc.)
- After review completes (APPROVED), the orchestrator extracts "Key Decisions Made" and "Remaining Notes" from the review
- These findings are passed to the code-agent as supplementary context
- The manifest entry includes:
  - `"scopeSize": "medium"`
  - `"reviewMode": "single-round"`
  - `"estimatedFiles": 4`

## Notes
The single-round architect review should still cover all three domains -- it is not domain-restricted. The difference from the current behavior is 1 round instead of 3+ sequential rounds.

# Scenario: Large scope spec triggers parallel domain review

## Type
feature

## Priority
critical -- validates the parallel review path

## Preconditions
- A feature spec exists with Implementation Size Estimate: `Scope size: large`, `Estimated file count: 8`
- Public and holdout scenarios exist
- No previous review files exist

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The orchestrator identifies scope as `large`
- Three architect-agents are spawned in parallel, each with a domain parameter:
  1. Security and data integrity domain
  2. Architecture and performance domain
  3. API design and backward compatibility domain
- Each architect-agent produces a domain-specific review file:
  - `test-feature.review-security.md`
  - `test-feature.review-architecture.md`
  - `test-feature.review-api.md`
- Architect-agents do NOT spawn spec-agents or modify the spec directly
- After all three complete, the orchestrator synthesizes findings into `test-feature.review.md` (backward-compatible format)
- If all three domains are APPROVED, overall status is APPROVED
- The orchestrator spawns ONE spec-agent (if any findings need addressing) or proceeds to implementation (if all clean)
- Findings ("Key Decisions Made" + "Remaining Notes") from the synthesized review are forwarded to code-agents
- The manifest entry includes:
  - `"scopeSize": "large"`
  - `"reviewMode": "parallel-full"`
  - `"estimatedFiles": 8`

## Notes
The parallel spawn pattern mirrors the existing parallel code-agent pattern in df-orchestrate. All three agents should be spawned in a single message.

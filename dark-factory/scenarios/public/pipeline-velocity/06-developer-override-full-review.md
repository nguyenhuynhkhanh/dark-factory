# Scenario: Developer overrides small spec to full review

## Type
feature

## Priority
high -- validates developer override capability

## Preconditions
- A feature spec exists with Implementation Size Estimate: `Scope size: small`, `Estimated file count: 1`
- No always-review patterns in the spec
- Public and holdout scenarios exist

## Action
Run `/df-orchestrate test-feature` and when prompted about review gating, the developer requests full review.

## Expected Outcome
- The orchestrator identifies scope as `small` and would normally skip review
- The orchestrator presents the scope assessment to the developer and offers the option to override
- The developer requests full review
- Full parallel domain review is triggered (large-scope behavior) despite the small estimate
- Three domain architect-agents are spawned
- All review files are created as normal
- The manifest entry includes:
  - `"scopeSize": "small"` (original estimate preserved)
  - `"reviewMode": "parallel-full"` (reflects the override)

## Notes
The developer override is irrevocable for the current run. Once full review is requested, the orchestrator does not re-evaluate.

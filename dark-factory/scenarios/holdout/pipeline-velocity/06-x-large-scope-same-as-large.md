# Scenario: x-large scope receives the same parallel review as large

## Type
edge-case

## Priority
medium -- confirms x-large is not a separate code path

## Preconditions
- A feature spec has Implementation Size Estimate: `Scope size: x-large`, `Estimated file count: 15`

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The orchestrator identifies scope as `x-large`
- `x-large` is treated identically to `large` for review purposes -- full parallel domain review
- Three domain architect-agents are spawned (not more)
- The manifest records `"scopeSize": "x-large"` and `"reviewMode": "parallel-full"`
- There is no additional review depth beyond parallel-full for x-large

## Failure Mode (if applicable)
If the orchestrator has a switch/case for scope sizes and `x-large` is not handled, it could fall through to the default (which should also be full review, but the scopeSize would be wrong in the manifest).

## Notes
The spec defines only three review modes: skipped, single-round, parallel-full. Both large and x-large map to parallel-full.

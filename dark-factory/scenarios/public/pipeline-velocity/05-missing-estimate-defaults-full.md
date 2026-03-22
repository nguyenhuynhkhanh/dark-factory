# Scenario: Spec with no Implementation Size Estimate defaults to full review

## Type
feature

## Priority
high -- validates the safe default path

## Preconditions
- A feature spec exists but has NO Implementation Size Estimate section
- Public and holdout scenarios exist
- No previous review files exist

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The orchestrator searches for the Implementation Size Estimate section and finds nothing
- The orchestrator warns the developer that no estimate was found and full review will be used
- The spec is treated as large scope -- full parallel domain review is triggered
- Three domain architect-agents are spawned in parallel
- Domain review files and synthesized review file are created
- The manifest entry includes:
  - `"scopeSize": null` (no estimate available)
  - `"reviewMode": "parallel-full"` (safe default)
  - `"estimatedFiles": null`

## Notes
This is the safe default path. It should be clearly communicated to the developer that adding an Implementation Size Estimate to the spec would enable faster review.

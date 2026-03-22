# Scenario: Post-hoc file count is logged in manifest

## Type
feature

## Priority
medium -- informational tracking, not gating

## Preconditions
- A feature was implemented with estimated file count of 3
- The code-agent(s) modified 5 files during implementation
- All holdout tests passed

## Action
The orchestrator completes the implementation cycle and proceeds to post-implementation steps.

## Expected Outcome
- After implementation completes (before promote step), the orchestrator counts distinct files modified by the code-agent(s)
- The manifest entry is updated with `"actualFiles": 5`
- The delta (estimated: 3, actual: 5) is visible in the manifest
- No action is taken on the delta -- it is informational only
- The promote and archive steps proceed normally

## Notes
The file count should include only files the code-agent created or modified, not files it merely read. If multiple code-agents ran in parallel, the count is the union of all modified files.

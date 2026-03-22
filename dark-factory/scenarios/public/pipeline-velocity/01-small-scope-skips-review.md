# Scenario: Small scope spec skips architect review

## Type
feature

## Priority
critical -- this is the primary happy path for the fast-track feature

## Preconditions
- A feature spec exists at `dark-factory/specs/features/test-feature.spec.md`
- The spec has an Implementation Size Estimate section with `Scope size: small` and `Estimated file count: 2`
- The spec's affected files do NOT include any always-review patterns (no auth, migration, security, middleware, schema, database, API contract, or route files)
- Public and holdout scenarios exist for the feature
- No previous review file exists

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The orchestrator reads the spec and identifies scope as `small`
- The orchestrator checks affected files against always-review patterns -- no matches found
- Architect review is skipped entirely -- no architect-agent is spawned
- The orchestrator proceeds directly to the implementation phase (code-agent spawning)
- The manifest entry for `test-feature` includes:
  - `"scopeSize": "small"`
  - `"reviewMode": "skipped"`
  - `"estimatedFiles": 2`
- No review file (`test-feature.review.md`) is created
- No findings are passed to the code-agent (standard inputs only: spec + public scenarios)

## Notes
Verify that the orchestrator's console output clearly indicates review was skipped and why.

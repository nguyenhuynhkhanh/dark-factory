# Scenario: Small spec touching auth is elevated to medium review

## Type
feature

## Priority
critical -- validates the always-review safety net

## Preconditions
- A feature spec exists with Implementation Size Estimate: `Scope size: small`, `Estimated file count: 2`
- The spec's affected files/modules section mentions `auth middleware` or lists a file path containing `auth`
- Public and holdout scenarios exist

## Action
Run `/df-orchestrate test-feature`

## Expected Outcome
- The orchestrator initially classifies scope as `small`
- The always-review pattern check finds a match on `auth`
- The scope is elevated to `medium` (at minimum)
- The orchestrator informs the developer: the spec touches high-risk patterns and review cannot be skipped
- A single-round architect review is conducted (medium-tier behavior)
- The manifest entry includes:
  - `"scopeSize": "small"` (original estimate preserved)
  - `"reviewMode": "single-round"` (reflects actual review mode after elevation)
- The review file is created and findings are forwarded to the code-agent

## Notes
The always-review patterns to check for are: auth, migration, security, middleware, schema, database, api contract, route definition. This scenario tests `auth` specifically but the same elevation logic applies to all patterns.

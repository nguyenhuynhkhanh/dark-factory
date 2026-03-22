# Scenario: Small bugfix touching database schema gets elevated review

## Type
edge-case

## Priority
high -- validates always-review patterns apply to bugfixes, not just features

## Preconditions
- A bugfix debug report exists with scope size `small` and estimated file count 1
- The affected file is a database schema/migration file (e.g., mentions `schema` or `migration` in the affected files)

## Action
Run `/df-orchestrate test-bug`

## Expected Outcome
- The orchestrator detects bugfix mode
- The review gating step runs identically to feature mode
- The always-review pattern check finds a match on `schema` or `migration`
- The scope is elevated to `medium` -- single-round architect review runs
- After review, the orchestrator proceeds to the Red-Green bugfix cycle (not feature implementation)
- The review findings are forwarded to the code-agent for both the Red Phase and Green Phase

## Failure Mode (if applicable)
If the implementation only applies always-review patterns in feature mode and skips the check in bugfix mode, high-risk bugfixes would bypass review.

## Notes
The spec explicitly states bugfixes use the same fast-track rules. The always-review check must run before the mode-specific implementation steps (Red-Green vs. feature implementation).

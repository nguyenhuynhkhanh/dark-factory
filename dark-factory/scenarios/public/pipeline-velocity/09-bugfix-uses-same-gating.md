# Scenario: Bugfix uses same review gating rules as features

## Type
feature

## Priority
high -- validates that bugfixes are not excluded from fast-track

## Preconditions
- A bugfix debug report exists at `dark-factory/specs/bugfixes/test-bug.spec.md`
- The debug report has an Implementation Size Estimate: `Scope size: small`, `Estimated file count: 1`
- The affected file does NOT match any always-review patterns
- Public and holdout scenarios exist for the bugfix

## Action
Run `/df-orchestrate test-bug`

## Expected Outcome
- The orchestrator detects bugfix mode (spec in `specs/bugfixes/`)
- The review gating step runs identically to feature mode
- Scope is `small` with no high-risk patterns -- review is skipped
- The orchestrator proceeds directly to the Red-Green bugfix cycle
- No architect-agent is spawned
- The manifest entry includes `"reviewMode": "skipped"`

## Notes
The only difference between feature and bugfix gating is the downstream behavior (Red-Green cycle vs. feature implementation). The gating logic itself is identical.

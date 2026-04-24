# Scenario: no out-of-scope files are modified by this spec's implementation

## Type
edge-case

## Priority
high — touching out-of-scope files introduces blast radius and cross-feature conflicts. architect-agent.md in particular must not be modified here; it is the target of the consumer spec.

## Preconditions
- This spec's implementation has landed on a feature branch.

## Action
Run: `git diff main --name-only` (or equivalent to list all files changed relative to the main branch). Filter for files that should NOT have been touched by this spec.

## Expected Outcome
- `architect-agent.md` is NOT in the changed file list (neither `.claude/agents/architect-agent.md` nor its plugin mirror).
- `implementation-agent.md` is NOT in the changed file list.
- `spec-agent.md` is NOT in the changed file list.
- `code-agent.md` is NOT in the changed file list.
- `debug-agent.md` is NOT in the changed file list.
- `dark-factory/templates/spec-template.md` is NOT in the changed file list.
- `dark-factory/templates/debug-report-template.md` is NOT in the changed file list.
- `dark-factory/manifest.json` is NOT in the changed file list.
- `dark-factory/promoted-tests.json` is NOT in the changed file list.

## Failure Mode
If any out-of-scope file is modified: this spec has exceeded its declared blast radius and may conflict with parallel specs (`token-opt-architect-review`) being implemented simultaneously.

## Notes
Validates AC-11, AC-12, AC-13. This is a regression guard — checking that the implementation stayed within its declared scope.

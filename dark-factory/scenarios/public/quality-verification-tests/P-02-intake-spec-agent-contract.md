# Scenario: df-intake to spec-agent contract tests pass

## Type
feature

## Priority
critical — the intake-to-spec-agent handoff is the most used pipeline entry point

## Preconditions
- `.claude/skills/df-intake/SKILL.md` exists
- `.claude/agents/spec-agent.md` exists

## Action
Run the contract test suite and check the intake pipeline contract tests.

## Expected Outcome
- Tests verify that df-intake references `spec-agent` for spawning
- Tests verify that df-intake defines perspective labels ("Lead A", "Lead B", "Lead C") with required output sections
- Tests verify that df-intake's writer phase references the spec output path `dark-factory/specs/features/` that spec-agent is expected to write to
- Tests verify that df-intake's writer phase references scenario output paths (`dark-factory/scenarios/public/` and `dark-factory/scenarios/holdout/`) that spec-agent writes to
- Each assertion checks BOTH the producing side (df-intake) AND consuming side (spec-agent) for the same path/format pattern
- At least 2-3 assertions per handoff

## Notes
The contract tests verify interface consistency, not agent behavior. They should check that the same path patterns and section headers appear on both sides of the handoff.

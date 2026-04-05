# Scenario: df-debug to debug-agent contract tests pass

## Type
feature

## Priority
critical — the debug pipeline is the other major entry point

## Preconditions
- `.claude/skills/df-debug/SKILL.md` exists
- `.claude/agents/debug-agent.md` exists

## Action
Run the contract test suite and check the debug pipeline contract tests.

## Expected Outcome
- Tests verify that df-debug references `debug-agent` for spawning investigators
- Tests verify that df-debug defines investigator labels ("Investigator A", "Investigator B", "Investigator C") with required output sections
- Tests verify that df-debug's writer phase references the debug report output path `dark-factory/specs/bugfixes/` that debug-agent writes to
- Tests verify that df-debug's writer phase references scenario paths (`dark-factory/scenarios/public/` and `dark-factory/scenarios/holdout/`) that debug-agent writes to
- Each assertion checks both the producing side and consuming side

## Notes
Parallel to P-02 but for the debug pipeline. Both pipelines must have independent contract coverage.

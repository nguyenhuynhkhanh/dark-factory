# Scenario: Architect iteration, onboard, wave, and promote-cleanup contracts pass

## Type
feature

## Priority
high — secondary contracts that complete the handoff coverage

## Preconditions
- All agent and skill files exist
- `.claude/agents/onboard-agent.md` exists
- `.claude/skills/df-cleanup/SKILL.md` exists

## Action
Run the contract test suite and check handoffs 6, 10, 11, 12.

## Expected Outcome
- **Handoff 6 (architect -> spec-agent iteration)**: Tests verify architect-agent references spawning `spec-agent` for features and `debug-agent` for bugfixes. Tests verify spec-agent has a re-spawn/architect-feedback handling phase.
- **Handoff 10 (onboard -> scanners)**: Tests verify onboard-agent references spawning scanner agents with directory chunks and defines an expected output structure for scanner results.
- **Handoff 11 (orchestrator -> wave-agent)**: Tests verify df-orchestrate passes spec names, branch context, and mode to wave agents. Wave agents handle the full lifecycle (architect, code, holdout, promote, cleanup).
- **Handoff 12 (promote -> cleanup)**: Tests verify promote-agent uses `DF-PROMOTED-START`/`DF-PROMOTED-END` annotation markers that df-cleanup scans for. Tests verify both reference `promoted-tests.json`.

## Notes
These contracts are less frequently exercised but equally important for refactoring safety.

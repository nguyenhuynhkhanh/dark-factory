# Scenario: Contract tests verify BOTH sides of each handoff, not just one

## Type
edge-case

## Priority
critical — a one-sided check gives false confidence

## Preconditions
- `tests/dark-factory-contracts.test.js` exists with contract tests

## Action
Read the contract test file and for each contract test, verify it reads BOTH the producing file AND the consuming file. Specifically check:

1. For handoff 2 (df-intake -> spec-agent writer): the test reads df-intake SKILL.md AND reads spec-agent.md, and asserts the same path pattern (e.g., `dark-factory/specs/features/`) appears in both
2. For handoff 4 (df-debug -> debug-agent writer): the test reads df-debug SKILL.md AND reads debug-agent.md, and asserts the same path pattern (e.g., `dark-factory/specs/bugfixes/`) appears in both
3. For handoff 7 (df-orchestrate -> code-agent): the test asserts "Key Decisions Made" appears in both df-orchestrate and code-agent
4. For handoff 8 (df-orchestrate -> test-agent): the test asserts `dark-factory/results/` path appears in both
5. For handoff 12 (promote -> cleanup): the test asserts `DF-PROMOTED-START` appears in both promote-agent and df-cleanup

## Expected Outcome
- Every contract test contains at least TWO `readAgent()` / `readSkill()` calls — one for the producer and one for the consumer
- Every contract test asserts the same key string/pattern in BOTH files
- No contract test only checks one side of the handoff

## Notes
This validates BR-1: each test must verify both directions of a handoff.

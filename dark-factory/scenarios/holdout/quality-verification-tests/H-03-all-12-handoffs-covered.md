# Scenario: All 12 distinct handoffs have dedicated contract tests

## Type
feature

## Priority
critical — missing a handoff means a blind spot during refactoring

## Preconditions
- `tests/dark-factory-contracts.test.js` exists

## Action
Read the test file and verify that each of the 12 handoffs from the spec has at least one dedicated test:

1. df-intake -> spec-agent (perspective assignment)
2. df-intake -> spec-agent (writer phase: spec + scenario output paths)
3. df-debug -> debug-agent (investigator assignment)
4. df-debug -> debug-agent (writer phase: report + scenario output paths)
5. df-orchestrate -> architect-agent (spec path, domain parameter, review file output)
6. architect-agent -> spec-agent (iteration: findings format, spawning)
7. df-orchestrate -> code-agent (spec, scenarios, architect findings, track format)
8. df-orchestrate -> test-agent (feature name, spec path, holdout paths)
9. df-orchestrate -> promote-agent (feature name, results path, registry)
10. onboard-agent -> scanner-agents (chunk format, output structure)
11. orchestrator -> wave-agent (spec names, branch, mode, result format)
12. promote-agent -> df-cleanup (annotation format, registry schema)

## Expected Outcome
- Each handoff has at least 2 assertions (minimum 24 assertions total across contract tests)
- No handoff is missing from the test file
- The total contract test count is approximately 30 (allowing for 2-3 assertions per handoff)

## Notes
Count the actual `it()` blocks or `assert.*` calls to verify coverage. Some handoffs may share a `describe()` block but each needs dedicated assertions.

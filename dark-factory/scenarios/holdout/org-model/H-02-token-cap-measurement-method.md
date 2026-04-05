# Scenario: Token cap test uses correct measurement method (agent file only, not agent+template)

## Type
edge-case

## Priority
high — measuring agent+template combined would defeat the purpose of extraction (EC-2)

## Preconditions
- Phase 1 implementation is complete
- Token cap tests exist in the test suite

## Action
Read the token cap test assertions in `tests/dark-factory-setup.test.js`. Verify:
1. The test reads ONLY the agent .md file content
2. The token calculation does NOT include template file content
3. The approximation formula is `Math.ceil(content.length / 4)` or equivalent

## Expected Outcome
- Token cap tests measure the agent file in isolation
- The test does NOT read or concatenate template file content into the measurement
- The cap values match the Resource Budgets table: spec-agent <= 4000, debug-agent <= 3000, onboard-agent <= 4000

## Notes
Corresponds to EC-2, BR-1. This is a subtle but critical distinction.

# Scenario: plugin mirror drift is caught by existing contract tests

## Type
edge-case

## Priority
high — a developer updating onboard-agent.md but forgetting the plugin mirror is the #1 failure mode in this project (documented as a Common Gotcha).

## Preconditions
- This spec's implementation has landed.
- Simulate: the source `.claude/agents/onboard-agent.md` contains the new Phase 7.2 slim-generation step, but `plugins/dark-factory/agents/onboard-agent.md` has NOT been updated (still the pre-spec version).

## Action
Run: `node --test tests/dark-factory-contracts.test.js`

## Expected Outcome
- The contract test reports a FAILURE for `onboard-agent.md` mirror parity.
- The failure message identifies which file pair mismatches.
- The test suite does not pass until the plugin mirror is updated to match the source.

## Failure Mode
If the contract test does NOT catch mirror drift: the plugin package (`npx dark-factory init`) installs an older version of onboard-agent that lacks slim-file generation. Users installing Dark Factory from npm get no slim files generated.

## Notes
Validates FR-15, BR-5, EC-8. Tests the existing test infrastructure's ability to catch this specific type of drift. The contract test already exists — this scenario verifies it covers the new files modified by this spec.

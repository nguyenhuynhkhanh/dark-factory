# Scenario: All test failures are flaky -- code-agent is NOT spawned

## Type
feature

## Priority
critical -- core flakiness routing behavior

## Preconditions
- Implementation-agent is in Feature Mode, Round 1, Step 3 (Evaluate)
- Test results show: 3 scenarios PASS (unit), 2 scenarios FLAKY (flaky-e2e), 0 scenarios FAIL
- `"flakyE2E": true` in results metadata

## Action
Implementation-agent evaluates results.

## Expected Outcome
- Implementation-agent separates flaky from clean failures: 0 clean failures, 2 flaky
- Since there are no clean failures, implementation-agent does NOT spawn a code-agent
- Implementation-agent spawns spec-agent in bugfix mode for the 2 flaky scenarios
- The round does NOT count toward the 3-round max (no code-agent was used)
- Implementation-agent logs: "Flaky E2E detected for {scenario names}. Spawning spec-agent for bugfix spec rather than re-running code-agent."

## Notes
Validates BR-4 and FR-6. When ALL failures are flaky, the code-agent loop is completely bypassed.

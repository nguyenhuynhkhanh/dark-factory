# Scenario: Mix of flaky and consistently failing E2E tests

## Type
edge-case

## Priority
high -- complex routing: two different handling paths in the same evaluation

## Preconditions
- Implementation-agent is in Feature Mode, Round 1, Step 3 (Evaluate)
- Test results show:
  - Scenario A: FAIL (type: e2e) -- failed all 3 attempts (consistent failure)
  - Scenario B: FLAKY (type: flaky-e2e) -- failed attempt 1, passed attempt 2
  - Scenario C: PASS (type: unit)
- `"flakyE2E": true` in results metadata

## Action
Implementation-agent evaluates results.

## Expected Outcome
- Implementation-agent identifies:
  - 1 clean failure (Scenario A) -- needs code-agent
  - 1 flaky failure (Scenario B) -- needs spec-agent
- Implementation-agent spawns BOTH in parallel:
  - Code-agent with behavioral failure summary for Scenario A (normal re-run flow)
  - Spec-agent in bugfix mode for Scenario B's flakiness
- The round counts toward the 3-round max (code-agent was used for Scenario A)
- Log distinguishes the two routing paths

## Notes
Validates EC-8. This is the most complex evaluation case -- the implementation-agent must split the failure list and handle each type with its correct routing.

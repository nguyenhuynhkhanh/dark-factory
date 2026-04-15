# Scenario: Test fails twice then passes on third attempt -- flaky

## Type
edge-case

## Priority
high -- tests the boundary of flakiness detection

## Preconditions
- Playwright tests run with `--retries=2` (3 total attempts)
- One scenario: attempt 1 FAIL, attempt 2 FAIL, attempt 3 PASS

## Action
Test-agent processes Playwright results in Step 4.

## Expected Outcome
- Scenario is classified as flaky (it passed after failing -- inconsistent behavior)
- Reported with type `flaky-e2e`
- Attempt breakdown: "Attempt 1: FAIL, Attempt 2: FAIL, Attempt 3: PASS"
- `"flakyE2E": true` set in results metadata
- Implementation-agent routes to spec-agent, not code-agent

## Notes
Validates FR-4 and BR-6. Even passing only on the last retry counts as flaky. The test's behavior is non-deterministic regardless of which attempt succeeds.

# Scenario: E2E test fails on all 3 attempts -- consistent failure, not flaky

## Type
edge-case

## Priority
high -- must distinguish consistent failures from flakiness

## Preconditions
- Playwright is installed, E2E tests run with `--retries=2`
- One E2E scenario fails on attempt 1, attempt 2, and attempt 3

## Action
Test-agent processes Playwright results in Step 4.

## Expected Outcome
- The consistently failing scenario is reported as FAIL with type `e2e` (NOT `flaky-e2e`)
- No attempt breakdown is shown (or if shown, all 3 say FAIL)
- Results summary does NOT set `"flakyE2E": true` (unless other scenarios ARE flaky)
- Implementation-agent treats this as a normal failure -- spawns code-agent for re-run
- Normal 3-round max applies

## Notes
Validates EC-7 and BR-3. Consistent failure = code problem. Flaky = infrastructure/timing problem. The routing is fundamentally different.

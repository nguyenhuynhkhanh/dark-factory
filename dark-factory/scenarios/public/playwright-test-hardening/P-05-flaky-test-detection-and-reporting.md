# Scenario: Flaky E2E test detected and reported with correct format

## Type
feature

## Priority
critical -- core flakiness detection

## Preconditions
- Playwright is installed, UI Layer is not "none"
- E2E tests are run with `--retries=2`
- One scenario fails on attempt 1, then passes on attempt 2 (flaky behavior)
- Other scenarios pass on first attempt

## Action
Test-agent runs Playwright tests and processes results in Step 4.

## Expected Outcome
- The flaky scenario is reported with type `flaky-e2e` (not `e2e`)
- The results file includes attempt breakdown:
  ```
  #### Scenario X: FLAKY
  - Behavior: {generic description}
  - Type: flaky-e2e
  - Attempts: Attempt 1: FAIL, Attempt 2: PASS
  ```
- The results summary metadata includes `"flakyE2E": true`
- Scenarios that passed on first attempt are reported normally as type `e2e` with PASS
- The overall summary distinguishes: "X/Y passed (N unit, M e2e, K flaky-e2e)"

## Notes
Validates FR-4, FR-5, and BR-6 (any inconsistency = flaky). A single flaky scenario in the run sets the `flakyE2E` flag for the entire results file.

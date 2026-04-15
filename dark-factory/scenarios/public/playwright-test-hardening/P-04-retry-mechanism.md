# Scenario: E2E tests use Playwright retry flag

## Type
feature

## Priority
critical -- core retry mechanism

## Preconditions
- Playwright is installed
- UI Layer is not "none"
- Holdout scenarios include E2E-type scenarios
- Dev server management has been resolved (either via webServer config or manual start)

## Action
Test-agent reaches Step 3 (Run Tests) for Playwright tests.

## Expected Outcome
- The Playwright test command includes `--retries=2`: `npx playwright test --retries=2 dark-factory/results/{feature}/holdout-e2e.spec.{ext}`
- If a test passes on first attempt, it is reported as PASS with type `e2e`
- If a test fails, Playwright automatically retries it up to 2 more times
- The test-agent does NOT implement its own retry loop -- it delegates to Playwright's built-in retry mechanism
- Unit tests are NOT affected by the retry flag (run separately with the project's test command, no retries)

## Notes
Validates FR-3 and BR-3 (retry is E2E-only). Key assertion: unit test execution path is completely unchanged.

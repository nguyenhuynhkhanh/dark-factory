# Scenario: Playwright not installed but UI Layer is not "none"

## Type
edge-case

## Priority
medium -- ensures backend-only exclusion does not interfere with existing "no Playwright" flow

## Preconditions
- Project profile exists, UI Layer is "React"
- Playwright is NOT installed (no `@playwright/test` in dependencies, no config file)
- Holdout scenarios include UI-behavior scenarios

## Action
Test-agent reads profile (Step 0), evaluates UI Layer (Step 0a), then runs Playwright detection (Step 0b).

## Expected Outcome
- Step 0a: UI Layer is "React" -- backend-only exclusion does NOT activate
- Step 0b: Playwright detection runs normally, finds no Playwright
- Existing behavior: test-agent reports "Playwright is not installed" message and proceeds with unit tests
- No dev server management is attempted (no Playwright = no E2E tests = no server needed)
- No retry mechanism is used (no E2E tests to retry)

## Notes
Validates EC-9. The backend-only exclusion and the "no Playwright installed" flow are independent. When UI Layer has a value but Playwright is missing, the existing non-E2E flow applies.

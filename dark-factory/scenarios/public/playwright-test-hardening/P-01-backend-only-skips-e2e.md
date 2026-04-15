# Scenario: Backend-only project skips all E2E detection and tests

## Type
feature

## Priority
critical -- prevents wasted cycles on projects that have no UI

## Preconditions
- Project profile exists at `dark-factory/project-profile.md`
- Tech Stack table contains row: `| UI Layer | none |`
- Playwright is installed in the project (but should not matter)
- Holdout scenarios include E2E-type scenarios

## Action
Test-agent is spawned for a feature. It reads the project profile in Step 0, then evaluates the UI Layer field in Step 0a.

## Expected Outcome
- Test-agent logs: "UI Layer is 'none' -- skipping E2E detection and tests"
- Playwright / E2E Detection (Step 0b) is entirely skipped -- no checks for `@playwright/test`, no config file search, no E2E pattern glob
- Scenario classification (Step 1) does not classify any scenario as `e2e` or `playwright`
- Only unit tests are written and run
- Results file contains only `unit` type entries, no `e2e` or `flaky-e2e`
- No dev server management is attempted

## Notes
This validates BR-1 (backend-only exclusion is absolute) and FR-1. The key assertion is that even if Playwright is installed and scenarios describe UI behavior, the exclusion gate prevents all E2E logic.

# Scenario: No webServer config, no profile dev server command, no npm run dev script

## Type
edge-case

## Priority
high -- complete fallback chain exhaustion

## Preconditions
- Playwright is installed, UI Layer is "React"
- `playwright.config.ts` has no `webServer` property
- Project profile has no Dev Server field
- `package.json` has no `dev` script (or no package.json at all)

## Action
Test-agent reaches Step 2.5 and tries all three detection methods.

## Expected Outcome
1. Test-agent reads Playwright config -- no `webServer` found
2. Test-agent reads project profile -- no dev server command found
3. Test-agent tries `npm run dev` -- script does not exist (command fails)
4. Test-agent logs: "Dev server failed to start within 30s -- skipping E2E tests"
5. E2E tests are skipped entirely
6. Unit tests still run normally
7. Results file contains only unit test results
8. No server process is left running (nothing was started)

## Notes
Validates EC-4. All three detection paths fail gracefully. The test-agent does not block or error -- it degrades to unit-only testing.

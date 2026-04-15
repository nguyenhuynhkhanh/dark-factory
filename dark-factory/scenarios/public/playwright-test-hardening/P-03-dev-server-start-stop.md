# Scenario: Test-agent starts and stops dev server when no webServer config

## Type
feature

## Priority
critical -- core dev server management flow

## Preconditions
- Project profile exists, UI Layer is "React"
- Playwright is installed
- `playwright.config.ts` does NOT contain a `webServer` property
- Project profile contains dev server start command (e.g., `Dev Server: npm run dev`)
- The dev server is NOT already running
- Dev server listens on port 3000 (matching Playwright baseURL)

## Action
Test-agent reaches Step 2.5 (Dev Server Management) before running Playwright tests.

## Expected Outcome
1. Test-agent reads `playwright.config.*`, finds no `webServer` property
2. Test-agent reads project profile, finds dev server command `npm run dev`
3. Test-agent starts `npm run dev` as a background process
4. Test-agent polls `http://localhost:3000` every 1 second
5. Server responds within timeout -- test-agent proceeds to run Playwright tests
6. After all Playwright tests complete (pass or fail), test-agent kills the background server process
7. Results file is written normally

## Failure Mode
If the server process is not killed after tests, subsequent test runs will fail with "port already in use." The cleanup MUST happen in a finally/cleanup block, not just on success path.

## Notes
Validates FR-2 and BR-5 (mandatory server cleanup). The server cleanup assertion is the most important part -- it must happen regardless of test outcome.

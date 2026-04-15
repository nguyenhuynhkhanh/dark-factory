# Scenario: Playwright webServer config detected -- server management delegated

## Type
feature

## Priority
critical -- double-starting a server causes port conflicts and test failures

## Preconditions
- Project profile exists, UI Layer is NOT "none" (e.g., "React" or "Next.js")
- Playwright is installed
- `playwright.config.ts` (or `.js`) contains a `webServer` property:
  ```js
  export default defineConfig({
    webServer: {
      command: 'npm run dev',
      port: 3000,
    },
    // ...
  });
  ```
- Holdout scenarios include E2E-type scenarios

## Action
Test-agent reaches Step 2.5 (Dev Server Management) before running Playwright tests.

## Expected Outcome
- Test-agent reads `playwright.config.*` and detects the `webServer` property
- Test-agent logs: "Playwright webServer config detected -- server management delegated to Playwright"
- Test-agent does NOT start its own dev server process
- Test-agent does NOT attempt to detect a dev server command from the profile
- Playwright tests run with `npx playwright test --retries=2 {path}` (Playwright starts/stops the server itself)
- After tests complete, test-agent does NOT attempt to kill any server process

## Notes
This validates BR-2. The webServer config is Playwright's native server management -- using it avoids double-start port conflicts.

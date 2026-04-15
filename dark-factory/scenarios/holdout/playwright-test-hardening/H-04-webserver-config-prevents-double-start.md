# Scenario: Playwright webServer config prevents test-agent from starting its own server

## Type
feature

## Priority
high -- port conflict prevention

## Preconditions
- Playwright is installed, UI Layer is "Vue"
- `playwright.config.ts` contains:
  ```js
  webServer: { command: 'npm run dev', port: 5173, reuseExistingServer: true }
  ```
- No dev server is currently running

## Action
Test-agent reaches Step 2.5, reads Playwright config.

## Expected Outcome
- Test-agent finds `webServer` property in Playwright config
- Test-agent does NOT run any server start command
- Test-agent does NOT read the project profile for a dev server command
- Test-agent does NOT attempt `npm run dev` fallback
- Playwright test command runs and Playwright itself manages server lifecycle
- After tests, test-agent does NOT attempt to kill any process

## Failure Mode
If test-agent starts its own server AND Playwright starts one via webServer, port 5173 will conflict. One server will fail to bind, causing either startup failure or test failures.

## Notes
Validates BR-2. The detection must be reliable -- parsing the config file for the `webServer` key.

# Scenario: Dev server port already in use -- assume server is running

## Type
edge-case

## Priority
high -- common in development environments

## Preconditions
- Playwright is installed, UI Layer is "Next.js"
- No `webServer` in Playwright config
- Profile has dev server command: `npm run dev`
- Port 3000 is already occupied (dev server from a previous run, or another process)

## Action
Test-agent starts `npm run dev` as background process in Step 2.5.

## Expected Outcome
- The `npm run dev` command fails or exits with "address already in use" error
- Test-agent detects the port is already responding to HTTP requests
- Test-agent logs: "Port 3000 already in use -- assuming dev server is running"
- Test-agent proceeds to run Playwright tests against the existing server
- After tests complete, test-agent does NOT kill any process (it did not start the server)

## Failure Mode
If test-agent kills the pre-existing server process, it breaks whatever was running on that port.

## Notes
Validates EC-11. The test-agent must distinguish between "I started this server" and "a server was already running." Only kill processes it started.

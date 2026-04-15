# Scenario: Dev server responds with non-200 status on health check

## Type
edge-case

## Priority
medium -- servers often return 404 or 500 on root path during startup

## Preconditions
- Test-agent has started a dev server successfully
- Dev server responds on port 3000 but returns HTTP 404 (no root route) or HTTP 500

## Action
Test-agent polls `http://localhost:3000` during health check wait in Step 2.5.

## Expected Outcome
- Test-agent receives HTTP 404 (or 500, or any non-200 response)
- Test-agent treats ANY HTTP response (any status code) as "server is running"
- Test-agent logs success and proceeds to run Playwright tests
- Only connection refused / connection timeout is treated as "server not ready"

## Notes
Validates EC-5. Many dev servers don't have a root handler, or return errors on startup before routes are registered. The health check should only verify the TCP connection is alive.

# Scenario: Dev server process dies during test execution

## Type
failure-recovery

## Priority
medium -- production resilience for dev server management

## Preconditions
- Test-agent started a dev server in Step 2.5
- Dev server was responding on port 3000
- During Playwright test execution, the dev server process crashes/exits

## Action
Playwright tests attempt to reach `localhost:3000` during test execution but get connection refused.

## Expected Outcome
- Playwright tests fail due to connection errors
- Retries are attempted (2 retries) -- server is still down, all retries fail
- All E2E scenarios report as FAIL (type: e2e) -- consistent failure, NOT flaky
- Test-agent's cleanup step detects the server process is already dead -- no kill needed, no error
- Results are written normally with failure descriptions
- Implementation-agent treats these as consistent failures (code-agent re-run path)

## Failure Mode
If test-agent tries to kill an already-dead process and throws an error, it could prevent results from being written.

## Notes
Validates EC-10. The server crash produces consistent failures (connection refused on every attempt), not flaky behavior. The cleanup step must handle the "process already dead" case gracefully.

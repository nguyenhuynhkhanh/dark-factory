# Scenario: P-05 — log-event.sh delivers event when jq is absent

## Type
feature

## Priority
critical — this is the core purpose of log-event.sh; the jq guard was silently killing all telemetry

## Preconditions
- `~/.df-factory/config.json` exists:
  ```json
  {
    "apiKey": "sk-live-key",
    "baseUrl": "http://localhost:PORT"
  }
  ```
- `~/.df-factory/event-queue.json` does NOT exist (clean state)
- `jq` is NOT installed
- A mock server at `http://localhost:PORT/api/v1/events` accepts POST requests and returns HTTP 200
- The mock server records all received requests

## Action
```sh
bash log-event.sh '{"event":"agent_started","agentId":"abc"}'
```

## Expected Outcome
- Exit code: 0
- No stdout output (script is silent)
- No stderr output
- Mock server received exactly 1 POST request to `/api/v1/events` with:
  - Header `Authorization: Bearer sk-live-key`
  - Header `Content-Type: application/json`
  - Body: `{"event":"agent_started","agentId":"abc"}`
- `~/.df-factory/event-queue.json` does NOT exist (event was delivered, nothing queued)

## Failure Mode
If the mock server receives 0 requests, the script is still exiting early (possibly due to a remaining jq check or a broken config-read). If it exits non-zero, something is crashing silently.

## Notes
The script redirects all output to /dev/null (line 7: `exec >/dev/null 2>&1`) so no stdout/stderr is visible — test by inspecting the mock server log and the queue file state.

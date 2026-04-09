# Scenario: P-07 — log-event.sh flushes queue on next invocation when server comes back online

## Type
feature

## Priority
high — validates the full round-trip: shell writes queue, shell reads queue, shell sends queued events

## Preconditions
- `~/.df-factory/config.json` exists:
  ```json
  {
    "apiKey": "sk-flush-key",
    "baseUrl": "http://localhost:PORT"
  }
  ```
- `~/.df-factory/event-queue.json` exists and was written by a PREVIOUS run of `log-event.sh` (shell-based writer):
  ```json
  {"version":1,"events":[{"queuedAt":"2026-01-01T00:00:00.000Z","payload":{"event":"queued_event","agentId":"queued-1"}}]}
  ```
- `jq` is NOT installed
- Mock server at `http://localhost:PORT/api/v1/events` returns HTTP 200 for all requests
- Mock server records all received requests

## Action
```sh
bash log-event.sh '{"event":"new_event","agentId":"new-1"}'
```

## Expected Outcome
- Exit code: 0
- Mock server received exactly 2 POST requests to `/api/v1/events`:
  1. The queued event payload: `{"event":"queued_event","agentId":"queued-1"}`
  2. The new event payload: `{"event":"new_event","agentId":"new-1"}`
- `~/.df-factory/event-queue.json` does NOT exist (both events delivered successfully, queue emptied)

## Failure Mode
If the mock server receives only 1 request (the new event), the queue was not flushed — the shell-based queue reader failed to parse the file written by the shell-based queue writer. If the file still exists after the run, `write_queue_events` with an empty array did not clean up.

## Notes
This scenario directly validates EC-8: the shell writer's output must be parseable by the shell reader on the next invocation. It is the key cross-run integration test for the queue mechanism.

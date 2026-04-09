# Scenario: P-06 — log-event.sh queues event when server is offline

## Type
feature

## Priority
high — offline queuing is a key reliability guarantee; jq removal must not break it

## Preconditions
- `~/.df-factory/config.json` exists with valid `apiKey` and `baseUrl`
- `~/.df-factory/event-queue.json` does NOT exist
- `jq` is NOT installed
- No server is reachable at the configured `baseUrl` (connection refused or network unreachable)

## Action
```sh
bash log-event.sh '{"event":"agent_stopped","agentId":"xyz"}'
```

## Expected Outcome
- Exit code: 0
- No stdout/stderr output
- `~/.df-factory/event-queue.json` exists and contains:
  ```json
  {"version":1,"events":[{"queuedAt":"<ISO timestamp>","payload":{"event":"agent_stopped","agentId":"xyz"}}]}
  ```
  - `version` is `1`
  - `events` is an array with exactly 1 entry
  - The entry has a `queuedAt` field (ISO 8601 UTC string) and a `payload` field matching the original input
- File permissions: 0600

## Failure Mode
If `event-queue.json` does not exist or is malformed, the shell-based queue writer failed. If `events` has 0 entries, the append logic did not run.

## Notes
The `queuedAt` timestamp format is `YYYY-MM-DDTHH:MM:SS.000Z` as produced by `date -u +"%Y-%m-%dT%H:%M:%S.000Z"`. EC-4: an empty events array `[]` is valid and must not be treated as an error on a subsequent flush.

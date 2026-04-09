# Scenario: H-06 — log-event.sh discards corrupt queue file and proceeds

## Type
edge-case

## Priority
medium — a truncated queue file from a prior crash must not permanently break telemetry

## Preconditions
- `~/.df-factory/config.json` valid
- `~/.df-factory/event-queue.json` exists but contains truncated/invalid JSON:
  ```
  {"version":1,"events":[{"queuedAt":"2026-01-01T00:
  ```
  (simulates a crash mid-write)
- `jq` is NOT installed
- Mock server returns HTTP 200

## Action
```sh
bash log-event.sh '{"event":"post_crash"}'
```

## Expected Outcome
- Exit code: 0
- No output
- Mock server received 1 request with payload `{"event":"post_crash"}`
- `~/.df-factory/event-queue.json` does NOT exist (current event delivered successfully, corrupt queue was discarded)

## Failure Mode
If the script exits without delivering the event, or if the queue file still contains the corrupt content, the corrupt-queue discard path did not execute. If the script crashes (bash error), the corrupt file is causing an unhandled error.

## Notes
EC-5 and BR-5. The shell implementation must treat any queue file it cannot parse as empty, not as a fatal error. The simplest validation: if `grep '"version".*1'` does not match, reset to empty.

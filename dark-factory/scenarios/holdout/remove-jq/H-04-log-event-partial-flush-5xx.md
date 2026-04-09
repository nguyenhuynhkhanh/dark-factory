# Scenario: H-04 — log-event.sh preserves queue integrity when server returns 5xx (partial flush)

## Type
failure-recovery

## Priority
high — events must not be lost or duplicated when the server is flaky

## Preconditions
- `~/.df-factory/config.json` valid
- `~/.df-factory/event-queue.json` contains 2 queued events (event-A and event-B), written by the shell-based writer
- `jq` is NOT installed
- Mock server behavior: returns HTTP 200 for event-A, returns HTTP 503 for event-B

## Action
```sh
bash log-event.sh '{"event":"event-C"}'
```

## Expected Outcome
- Mock server received:
  - 1 request for event-A (flushed successfully)
  - 1 request for event-B (received 503 — kept in queue)
  - 1 request for event-C (new event — behavior depends on server response for it; assume 200 for this scenario)
- `~/.df-factory/event-queue.json` exists and contains exactly:
  - event-B (the 503 survivor)
  - event-C is NOT in the queue (was delivered successfully)
- The queue envelope is valid: `{"version":1,"events":[<event-B entry>]}`

## Failure Mode
If event-B is missing from the queue after the run, the 503 handling silently dropped it. If the file is malformed JSON, the shell writer corrupted it during the partial-flush write. If event-A appears in the queue, the success case is not removing delivered events.

## Notes
BR-4: the queue envelope must be preserved correctly even when only a subset of events are retained. This tests the survivor-list write path.

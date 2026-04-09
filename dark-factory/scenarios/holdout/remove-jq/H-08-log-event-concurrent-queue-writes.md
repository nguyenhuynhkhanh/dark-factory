# Scenario: H-08 — log-event.sh concurrent invocations do not corrupt the queue

## Type
concurrency

## Priority
medium — the locking mechanism must still work correctly after jq removal; shell changes must not disturb the lock paths

## Preconditions
- `~/.df-factory/config.json` valid
- `~/.df-factory/event-queue.json` does NOT exist
- `jq` is NOT installed
- No server reachable (both instances will queue their events)
- `flock` is either available (tests flock path) or absent (tests mkdir-spin path); run both variants

## Action
Launch two instances simultaneously:
```sh
bash log-event.sh '{"event":"concurrent-A"}' &
bash log-event.sh '{"event":"concurrent-B"}' &
wait
```

## Expected Outcome
- Both processes exit 0
- `~/.df-factory/event-queue.json` exists and contains exactly 2 events in the `events` array:
  - One entry with payload `{"event":"concurrent-A"}`
  - One entry with payload `{"event":"concurrent-B"}`
- The file is valid JSON (not interleaved/corrupted writes)

## Failure Mode
If only 1 event appears in the queue, one instance's write was lost due to a race condition in the shell queue writer. If the file is malformed JSON, the concurrent writes interleaved without the lock protecting them. This would indicate the jq removal changed the write path in a way that broke the lock semantics.

## Notes
EC-7. The lock mechanism (`flock`/`mkdir`-spin) is unchanged by this spec. This scenario validates that no accidental change to the write path was introduced during jq removal. Run 5-10 times to expose intermittent races.

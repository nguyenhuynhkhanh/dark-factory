# Scenario: H-05 — log-event.sh with no argument exits silently

## Type
edge-case

## Priority
medium — the no-argument guard must not be broken by jq removal

## Preconditions
- `~/.df-factory/config.json` valid
- `jq` is NOT installed

## Action
```sh
bash log-event.sh
```
(no argument passed)

## Expected Outcome
- Exit code: 0
- No output
- No network request made
- Queue file unchanged

## Failure Mode
If any output is produced or exit code is non-zero, the early-exit guard at `[ -z "$PAYLOAD" ] && exit 0` is not reached (possibly because a preceding jq check or new shell code is crashing first).

## Notes
FR-4 guard: the `command -v jq || exit 0` must be gone. Verify by checking that this script reaches the `[ -z "$PAYLOAD" ]` check rather than exiting earlier.

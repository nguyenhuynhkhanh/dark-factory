# Scenario: P-04 — df-check-onboard.sh exits 1 when config is missing

## Type
feature

## Priority
critical — the missing-config error message is user-facing; must be correct

## Preconditions
- `~/.df-factory/config.json` does NOT exist
- `jq` is NOT installed

## Action
```sh
bash df-check-onboard.sh
```

## Expected Outcome
- Exit code: 1
- Stdout: "DF is not configured. Run df-onboard.sh first."
- Stderr: empty

## Failure Mode
If exit code is 0 or the message is different, the error path is broken.

## Notes
This covers BR-2 (empty extraction treated as missing). See also H-02 for the partially-populated config variant.

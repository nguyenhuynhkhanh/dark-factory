# Scenario: H-07 — df-onboard.sh handles hostname with a space in COMPUTER_NAME

## Type
edge-case

## Priority
medium — the printf-based request body must not produce invalid JSON when hostname contains a space

## Preconditions
- `~/.df-factory/config.json` does not exist
- `jq` is NOT installed
- `COMPUTER_NAME` (result of `hostname`) is set to `My MacBook Pro` (contains spaces)
- Mock server at the configured URL records the request body and returns HTTP 200

## Action
Override hostname in a test wrapper and run `df-onboard.sh`:
```sh
hostname() { echo "My MacBook Pro"; }
export -f hostname
printf 'http://localhost:PORT\nsk-key\n' | bash df-onboard.sh
```

## Expected Outcome
- Exit code: 0
- Mock server received a request body that is parseable as JSON
- The `computerName` field value is `"My MacBook Pro"` (with spaces preserved inside the JSON string)

## Failure Mode
If the server receives malformed JSON (e.g., `{"computerName":My MacBook Pro,...}` without quotes), the printf interpolation broke JSON structure. This is EC-6: the existing fallback does not escape the value, so this test verifies the behavior is at minimum no worse than before.

## Notes
The spec explicitly does not require the implementation to escape special characters in `computerName` or `gitUserId` — it only requires the behavior is unchanged from the existing `printf` fallback. This scenario confirms there is no regression. The `printf` format string wraps the value in double quotes: `"computerName":"${COMPUTER_NAME}"` — spaces within a quoted JSON string value are valid JSON.

# Scenario: H-01 — df-check-onboard.sh correctly extracts baseUrl containing forward slashes

## Type
edge-case

## Priority
high — URLs containing slashes are the default case for any real deployment; if sed uses / as delimiter and the value contains /, extraction silently fails

## Preconditions
- `~/.df-factory/config.json` exists:
  ```json
  {
    "apiKey": "sk-slash-test",
    "baseUrl": "https://prime-factory.example.com/sub/path"
  }
  ```
- `jq` is NOT installed

## Action
```sh
bash df-check-onboard.sh
```

## Expected Outcome
- Exit code: 0
- No output

## Failure Mode
If exit code is 1, the sed command is using `/` as a delimiter and the slashes in the URL are being interpreted as sed delimiters, causing extraction to yield an empty string.

## Notes
EC-1. The implementation MUST use a delimiter other than `/` in any sed expression that processes the baseUrl value (e.g., `|` or `#`). This is the most likely implementation defect. Validate by also running `log-event.sh` with this config and confirming the correct URL is used in the curl call.

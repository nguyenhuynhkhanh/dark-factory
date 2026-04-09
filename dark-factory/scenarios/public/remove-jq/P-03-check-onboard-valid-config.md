# Scenario: P-03 — df-check-onboard.sh exits 0 when config is valid

## Type
feature

## Priority
critical — df-check-onboard.sh is called as a guard before every CLI command; a false negative blocks all CLI usage

## Preconditions
- `~/.df-factory/config.json` exists:
  ```json
  {
    "apiKey": "12345",
    "baseUrl": "https://prime-factory.example.com"
  }
  ```
  (Note: `apiKey` is all-digits to exercise EC-2)
- `jq` is NOT installed

## Action
```sh
bash df-check-onboard.sh
```

## Expected Outcome
- Exit code: 0
- Stdout: empty (no output)
- Stderr: empty (no output)

## Failure Mode
If exit code is 1 or any output is produced, the grep/sed extraction is not working correctly for one or both fields.

## Notes
The all-digit API key (`12345`) specifically tests that the extraction does not require non-numeric characters to be present in the value (EC-2).

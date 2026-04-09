# Scenario: P-01 — df-onboard.sh writes valid config using printf only

## Type
feature

## Priority
critical — this is the core write path; if config is malformed all downstream scripts break

## Preconditions
- `~/.df-factory/config.json` does not exist
- `jq` is NOT installed (or has been removed from PATH for this test)
- A mock server is available at `http://localhost:PORT/api/v1/installs/activate` that returns HTTP 200

## Action
Run `df-onboard.sh` non-interactively by piping answers:
```
printf 'http://localhost:PORT\nsk-test-key-123\n' | bash df-onboard.sh
```
(or equivalent test harness that feeds the two prompts)

## Expected Outcome
- Exit code: 0
- Stdout: "Onboarding complete. You're connected to http://localhost:PORT."
- `~/.df-factory/config.json` exists and contains:
  ```json
  {
    "apiKey": "sk-test-key-123",
    "baseUrl": "http://localhost:PORT"
  }
  ```
  (exact key names `apiKey` and `baseUrl`; values match inputs; no extra fields)
- File permissions on `~/.df-factory/config.json`: 0600
- Directory permissions on `~/.df-factory/`: 0700
- The script source contains no occurrence of the string `jq`

## Failure Mode
If the script exits non-zero or config is missing/malformed, the test fails and indicates the printf path did not execute correctly.

## Notes
The activation request body sent to the server must be valid JSON with `computerName` and `gitUserId` fields. The mock server should log the request body so the test can assert it is valid JSON.

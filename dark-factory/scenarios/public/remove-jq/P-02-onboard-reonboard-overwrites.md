# Scenario: P-02 — df-onboard.sh re-onboard overwrites existing config

## Type
feature

## Priority
high — re-onboard is a documented user flow; must work without jq

## Preconditions
- `~/.df-factory/config.json` exists with stale values:
  ```json
  {
    "apiKey": "sk-old-key",
    "baseUrl": "http://old-server.example.com"
  }
  ```
- `jq` is NOT installed
- A mock server at `http://localhost:PORT/api/v1/installs/activate` returns HTTP 200

## Action
Run `df-onboard.sh` providing:
1. Answer `y` to the re-onboard prompt
2. New server URL: `http://localhost:PORT`
3. New API key: `sk-new-key-456`

```
printf 'y\nhttp://localhost:PORT\nsk-new-key-456\n' | bash df-onboard.sh
```

## Expected Outcome
- Exit code: 0
- Stdout: "Onboarding complete. You're connected to http://localhost:PORT."
- `~/.df-factory/config.json` contains the NEW values:
  ```json
  {
    "apiKey": "sk-new-key-456",
    "baseUrl": "http://localhost:PORT"
  }
  ```
- Old values (`sk-old-key`, `old-server`) are gone

## Failure Mode
If the old config values survive in the file, the atomic overwrite (temp file + mv) did not work correctly.

## Notes
Answering `n` or entering a blank line to the re-onboard prompt should exit 0 with no changes — that path is unchanged and need not be retested here.

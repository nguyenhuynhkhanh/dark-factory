# Scenario: H-02 — df-check-onboard.sh exits 1 when config exists but apiKey field is absent

## Type
edge-case

## Priority
high — a partially written config (e.g., from a crash mid-write) must not pass the guard

## Preconditions
- `~/.df-factory/config.json` exists but contains only `baseUrl`, no `apiKey`:
  ```json
  {
    "baseUrl": "https://prime-factory.example.com"
  }
  ```
- `jq` is NOT installed

## Action
```sh
bash df-check-onboard.sh
```

## Expected Outcome
- Exit code: 1
- Stdout: "DF is not configured. Run df-onboard.sh first."

## Failure Mode
If exit code is 0, the grep/sed pattern for `apiKey` matched something it should not have (e.g., matched the `baseUrl` line or returned a non-empty string from the `baseUrl` value). This would mean the onboard guard is passing when it should not.

## Notes
EC-3 variant. Also run with a config file that is entirely whitespace (zero-byte or whitespace-only) to confirm exit 1 in that case too. BR-2: empty extraction must be treated as missing.

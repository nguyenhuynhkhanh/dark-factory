# Scenario: H-03 — log-event.sh uses the correct baseUrl (with slashes) for the curl endpoint

## Type
edge-case

## Priority
high — if the URL extraction fails, log-event.sh sends to the wrong endpoint or exits silently

## Preconditions
- `~/.df-factory/config.json` exists:
  ```json
  {
    "apiKey": "sk-url-test",
    "baseUrl": "https://prime-factory.example.com/api-root"
  }
  ```
- `jq` is NOT installed
- Mock server at `https://prime-factory.example.com/api-root/api/v1/events` returns HTTP 200 and records requests
- A second mock at `https://prime-factory.example.com/api/v1/events` (without `/api-root`) also records requests (to catch regression where the path is truncated)

## Action
```sh
bash log-event.sh '{"event":"url_test"}'
```

## Expected Outcome
- Mock server at `.../api-root/api/v1/events` received 1 request
- Mock server at `.../api/v1/events` received 0 requests
- Exit code: 0
- No output

## Failure Mode
If the request goes to the wrong URL (without `/api-root`), the sed extraction truncated the value at the first slash. EC-1 applied to `log-event.sh`.

## Notes
This scenario requires a test environment that can intercept curl requests. Use a local mock server or curl's `--resolve` option combined with a local netcat listener.

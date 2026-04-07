# Holdout Test Results — api-key-management-cli

## H-01-onboard-401-and-network-error: onboard handles 401, 400, and network error
Status: PASS
Evidence: `df-onboard.sh` has explicit `401)` branch → "Invalid or expired API key" + exit 1. HTTP 400 falls to `*)` catch-all → "Failed to connect" + exit 1. Network error caught by `if [ $CURL_EXIT -ne 0 ] || [ -z "$HTTP_CODE" ]` before case evaluation. Config is only written after 2xx — never written on any error path.

## H-02-check-onboard-malformed-json: check-onboard handles malformed JSON
Status: PASS
Evidence: `df-check-onboard.sh` uses `jq -r '.apiKey // empty' 2>/dev/null`. Malformed JSON causes jq to exit non-zero with no stdout; `[ -z "$API_KEY" ]` triggers "DF is not configured. Run df-onboard.sh first." + exit 1. No jq error fragments surface on stdout.

## H-03-onboard-trailing-slash-stripping: onboard strips all trailing slashes
Status: PASS
Evidence: `while [ "${BASE_URL%/}" != "$BASE_URL" ]; do BASE_URL="${BASE_URL%/}"; done` — while loop handles any number of trailing slashes including `///`. Normalized URL used in both the activate request and config write. Invalid scheme (ftp://) caught by `case` before network call.

## H-04-onboard-gitUserId-fallback-chain: onboard gitUserId fallback chain
Status: PASS
Evidence: Three-step fallback: `git config user.email` → `git config user.name` → `$USER`. Each step guarded by `[ -z "$GIT_USER_ID" ]`. `2>/dev/null` suppresses errors if git not installed; `$()` returns empty on non-zero exit. All four cases (email set, email empty+name set, both empty, git missing) route correctly.

## Summary
Total: 4 passed, 0 failed

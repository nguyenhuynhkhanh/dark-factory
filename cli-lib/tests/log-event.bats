#!/usr/bin/env bats
# cli-lib/tests/log-event.bats
# bats-core test suite for cli-lib/log-event.sh

# ── Setup / Teardown ─────────────────────────────────────────────────────────

setup() {
  # Isolated home dir per test
  export HOME
  HOME="$(mktemp -d)"
  export MOCK_BIN
  MOCK_BIN="$(mktemp -d)"
  mkdir -p "$HOME/.df-factory"
  echo '{"apiKey":"test-key","baseUrl":"http://localhost:9999"}' \
    > "$HOME/.df-factory/config.json"
  export PATH="$MOCK_BIN:$PATH"
}

teardown() {
  rm -rf "$HOME" "$MOCK_BIN"
}

# ── Helper: write a mock curl that echoes an HTTP status code ─────────────────

write_mock_curl_status() {
  local status="$1"
  cat > "$MOCK_BIN/curl" <<EOF
#!/usr/bin/env bash
# Extract --write-out format string and print the status code to stdout
# All other output is suppressed (matches --silent --output /dev/null)
echo -n "$status"
EOF
  chmod +x "$MOCK_BIN/curl"
}

# ── Helper: write a mock curl that exits non-zero (network error) ─────────────

write_mock_curl_network_error() {
  cat > "$MOCK_BIN/curl" <<'EOF'
#!/usr/bin/env bash
exit 6
EOF
  chmod +x "$MOCK_BIN/curl"
}

# ── Helper: write a mock curl that records its args then returns a status ──────

write_mock_curl_recording() {
  local status="$1"
  local call_log="$2"
  cat > "$MOCK_BIN/curl" <<EOF
#!/usr/bin/env bash
echo "\$@" >> "$call_log"
echo -n "$status"
EOF
  chmod +x "$MOCK_BIN/curl"
}

# ═════════════════════════════════════════════════════════════════════════════
# P-01: Happy-path delivery
# ═════════════════════════════════════════════════════════════════════════════

@test "P-01: happy-path — curl called once, no queue file, exit 0, no output" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"test","value":1}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  # curl was called exactly once
  [ "$(wc -l < "$call_log")" -eq 1 ]
  # No queue file
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

@test "P-01: happy-path — curl receives correct URL, auth header, content-type, payload" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"deploy","env":"prod"}'

  [ "$status" -eq 0 ]
  # URL contains the right endpoint
  grep -q "http://localhost:9999/api/v1/events" "$call_log"
  # Authorization header present
  grep -q "Authorization: Bearer test-key" "$call_log"
  # Content-Type header present
  grep -q "Content-Type: application/json" "$call_log"
  # Payload present in args
  grep -q '"event":"deploy"' "$call_log"
}

# ═════════════════════════════════════════════════════════════════════════════
# P-02: Missing config — silent drop
# ═════════════════════════════════════════════════════════════════════════════

@test "P-02: missing config — curl NOT called, no queue, exit 0, no output" {
  rm -f "$HOME/.df-factory/config.json"
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"test"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ ! -f "$call_log" ]
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# P-03: HTTP 4xx — drop, do not queue
# ═════════════════════════════════════════════════════════════════════════════

@test "P-03: HTTP 401 — event dropped, NOT queued, exit 0, no output" {
  write_mock_curl_status "401"

  run bash cli-lib/log-event.sh '{"event":"test"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

@test "P-03: HTTP 400 — event dropped, NOT queued, exit 0, no output" {
  write_mock_curl_status "400"

  run bash cli-lib/log-event.sh '{"event":"test"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# P-04: Queue flush before current event
# ═════════════════════════════════════════════════════════════════════════════

@test "P-04: existing queue entry flushed first, then current event sent — 2 curl calls total" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  # Pre-populate queue with one entry
  cat > "$HOME/.df-factory/event-queue.json" <<'QEOF'
{"version":1,"events":[{"queuedAt":"2026-04-07T00:00:00.000Z","payload":{"event":"queued-one"}}]}
QEOF

  run bash cli-lib/log-event.sh '{"event":"current"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]

  # Exactly 2 curl calls
  [ "$(wc -l < "$call_log")" -eq 2 ]

  # First call is the queued event
  local first_call
  first_call="$(sed -n '1p' "$call_log")"
  echo "$first_call" | grep -q '"event":"queued-one"'

  # Second call is the current event
  local second_call
  second_call="$(sed -n '2p' "$call_log")"
  echo "$second_call" | grep -q '"event":"current"'

  # Queue is now empty
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# P-05: Network error — event queued
# ═════════════════════════════════════════════════════════════════════════════

@test "P-05: network error — event queued with correct schema" {
  write_mock_curl_network_error

  run bash cli-lib/log-event.sh '{"event":"net-fail","x":42}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ -f "$HOME/.df-factory/event-queue.json" ]

  local qfile="$HOME/.df-factory/event-queue.json"

  # version = 1
  [ "$(jq '.version' "$qfile")" = "1" ]

  # exactly 1 event
  [ "$(jq '.events | length' "$qfile")" = "1" ]

  # payload matches
  [ "$(jq -c '.events[0].payload' "$qfile")" = '{"event":"net-fail","x":42}' ]

  # queuedAt is non-empty
  local queued_at
  queued_at="$(jq -r '.events[0].queuedAt' "$qfile")"
  [ -n "$queued_at" ]
  # Basic ISO 8601 check: starts with a digit year
  [[ "$queued_at" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]
}

# ═════════════════════════════════════════════════════════════════════════════
# P-06: HTTP 5xx — event queued
# ═════════════════════════════════════════════════════════════════════════════

@test "P-06: HTTP 500 — event queued with 1 entry, exit 0, no output" {
  write_mock_curl_status "500"

  run bash cli-lib/log-event.sh '{"event":"server-fail"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ -f "$HOME/.df-factory/event-queue.json" ]
  [ "$(jq '.events | length' "$HOME/.df-factory/event-queue.json")" = "1" ]
}

@test "P-06: HTTP 503 — event queued, exit 0, no output" {
  write_mock_curl_status "503"

  run bash cli-lib/log-event.sh '{"event":"server-fail-503"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ -f "$HOME/.df-factory/event-queue.json" ]
  [ "$(jq '.events | length' "$HOME/.df-factory/event-queue.json")" = "1" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# P-07: Corrupted queue — reset and proceed
# ═════════════════════════════════════════════════════════════════════════════

@test "P-07: corrupted queue — reset, curl called once for current event only" {
  echo 'THIS IS NOT JSON }{[' > "$HOME/.df-factory/event-queue.json"
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"after-corrupt"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]

  # Only 1 curl call — the current event (no queued events to flush)
  [ "$(wc -l < "$call_log")" -eq 1 ]

  # Queue is empty/absent after successful delivery
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# EC-1: Empty apiKey → no curl, no queue
# ═════════════════════════════════════════════════════════════════════════════

@test "EC-1: empty apiKey string — curl NOT called, no queue, exit 0, no output" {
  echo '{"apiKey":"","baseUrl":"http://localhost:9999"}' \
    > "$HOME/.df-factory/config.json"
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"test"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ ! -f "$call_log" ]
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# EC-12: No arguments → exit 0, no output, no curl
# ═════════════════════════════════════════════════════════════════════════════

@test "EC-12: no arguments — exit 0, no output, curl NOT called" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ ! -f "$call_log" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# Concurrency: two concurrent invocations, both fail → both in queue
# ═════════════════════════════════════════════════════════════════════════════

@test "concurrent: two simultaneous network-error invocations — both events in queue" {
  write_mock_curl_network_error

  # Run both in background and wait for both to finish
  bash cli-lib/log-event.sh '{"event":"concurrent-1"}' &
  local pid1=$!
  bash cli-lib/log-event.sh '{"event":"concurrent-2"}' &
  local pid2=$!
  wait $pid1
  wait $pid2

  # Both should exit 0 (wait captures exit; just verify queue)
  [ -f "$HOME/.df-factory/event-queue.json" ]

  local count
  count="$(jq '.events | length' "$HOME/.df-factory/event-queue.json")"
  [ "$count" -eq 2 ]
}

# ═════════════════════════════════════════════════════════════════════════════
# Additional edge cases
# ═════════════════════════════════════════════════════════════════════════════

@test "apiKey null in JSON — curl NOT called, no queue, exit 0" {
  echo '{"apiKey":null,"baseUrl":"http://localhost:9999"}' \
    > "$HOME/.df-factory/config.json"
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"test"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]
  [ ! -f "$call_log" ]
}

@test "queue with wrong version — treated as corrupted, reset" {
  echo '{"version":2,"events":[{"queuedAt":"2026-04-07T00:00:00.000Z","payload":{"event":"old"}}]}' \
    > "$HOME/.df-factory/event-queue.json"
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"current"}'

  [ "$status" -eq 0 ]
  # Only 1 call — bad queue was reset, only current event sent
  [ "$(wc -l < "$call_log")" -eq 1 ]
}

@test "queue has 50 events all flush OK, current event fails — queue has exactly 1 entry" {
  # Build a queue with 50 events
  local events="[]"
  for i in $(seq 1 50); do
    events="$(echo "$events" | jq --argjson n "$i" \
      '. + [{"queuedAt":"2026-04-07T00:00:00.000Z","payload":{"seq": $n}}]')"
  done
  printf '{"version":1,"events":%s}\n' "$events" > "$HOME/.df-factory/event-queue.json"

  # Call counter: first 50 calls return 201, then 500
  local call_count_file="$HOME/call-count"
  echo "0" > "$call_count_file"

  cat > "$MOCK_BIN/curl" <<MEOF
#!/usr/bin/env bash
count=\$(cat "$call_count_file")
count=\$((count + 1))
echo "\$count" > "$call_count_file"
if [ "\$count" -le 50 ]; then
  echo -n "201"
else
  echo -n "500"
fi
MEOF
  chmod +x "$MOCK_BIN/curl"

  run bash cli-lib/log-event.sh '{"event":"current-fail"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]

  # Queue should have exactly 1 entry (the failed current event)
  [ -f "$HOME/.df-factory/event-queue.json" ]
  [ "$(jq '.events | length' "$HOME/.df-factory/event-queue.json")" = "1" ]
  [ "$(jq -r '.events[0].payload.event' "$HOME/.df-factory/event-queue.json")" = "current-fail" ]
}

@test "baseUrl with trailing slash — normalized, correct endpoint called" {
  echo '{"apiKey":"test-key","baseUrl":"http://localhost:9999/"}' \
    > "$HOME/.df-factory/config.json"
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "201" "$call_log"

  run bash cli-lib/log-event.sh '{"event":"trailing-slash"}'

  [ "$status" -eq 0 ]
  # Should NOT have double slash
  grep -v "localhost:9999//api" "$call_log" | grep -q "localhost:9999/api/v1/events"
}

@test "partial flush — 5xx event kept, 2xx events removed" {
  # Queue: two events. First returns 201, second returns 500
  cat > "$HOME/.df-factory/event-queue.json" <<'QEOF'
{"version":1,"events":[
  {"queuedAt":"2026-04-07T00:00:00.000Z","payload":{"seq":1}},
  {"queuedAt":"2026-04-07T00:00:01.000Z","payload":{"seq":2}}
]}
QEOF

  local call_count_file="$HOME/call-count"
  echo "0" > "$call_count_file"

  # Current event also returns 201
  cat > "$MOCK_BIN/curl" <<MEOF
#!/usr/bin/env bash
count=\$(cat "$call_count_file")
count=\$((count + 1))
echo "\$count" > "$call_count_file"
if [ "\$count" -eq 1 ]; then
  echo -n "201"
elif [ "\$count" -eq 2 ]; then
  echo -n "500"
else
  echo -n "201"
fi
MEOF
  chmod +x "$MOCK_BIN/curl"

  run bash cli-lib/log-event.sh '{"event":"current"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]

  # Queue should have exactly 1 event (seq:2 which got 500)
  [ -f "$HOME/.df-factory/event-queue.json" ]
  [ "$(jq '.events | length' "$HOME/.df-factory/event-queue.json")" = "1" ]
  [ "$(jq '.events[0].payload.seq' "$HOME/.df-factory/event-queue.json")" = "2" ]
}

@test "4xx during flush — queued entry dropped, not retried" {
  cat > "$HOME/.df-factory/event-queue.json" <<'QEOF'
{"version":1,"events":[
  {"queuedAt":"2026-04-07T00:00:00.000Z","payload":{"event":"stale-401"}}
]}
QEOF

  # Queue flush returns 401, current event returns 201
  local call_count_file="$HOME/call-count"
  echo "0" > "$call_count_file"

  cat > "$MOCK_BIN/curl" <<MEOF
#!/usr/bin/env bash
count=\$(cat "$call_count_file")
count=\$((count + 1))
echo "\$count" > "$call_count_file"
if [ "\$count" -eq 1 ]; then
  echo -n "401"
else
  echo -n "201"
fi
MEOF
  chmod +x "$MOCK_BIN/curl"

  run bash cli-lib/log-event.sh '{"event":"current"}'

  [ "$status" -eq 0 ]
  [ -z "$output" ]

  # Queue should be empty — stale-401 was dropped, current was delivered
  [ ! -f "$HOME/.df-factory/event-queue.json" ]
}

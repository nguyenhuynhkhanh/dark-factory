#!/usr/bin/env bats
# cli-lib/tests/api-key-management-cli.test.bats
# bats-core test suite for df-onboard.sh and df-check-onboard.sh

# ── Setup / Teardown ─────────────────────────────────────────────────────────

setup() {
  export HOME
  HOME="$(mktemp -d)"
  export MOCK_BIN
  MOCK_BIN="$(mktemp -d)"
  export PATH="$MOCK_BIN:$PATH"

  # Mock git so we control user.email output
  cat > "$MOCK_BIN/git" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "config" ] && [ "$2" = "user.email" ]; then
  echo "alice@example.com"
elif [ "$1" = "config" ] && [ "$2" = "user.name" ]; then
  echo "Alice"
fi
EOF
  chmod +x "$MOCK_BIN/git"

  # Mock hostname
  cat > "$MOCK_BIN/hostname" <<'EOF'
#!/usr/bin/env bash
echo "dev-laptop"
EOF
  chmod +x "$MOCK_BIN/hostname"
}

teardown() {
  rm -rf "$HOME" "$MOCK_BIN"
}

# ── Helpers ──────────────────────────────────────────────────────────────────

# Write a mock curl that returns a given HTTP status code.
# The mock emits a newline then the status code (matching curl -w "\n%{http_code}").
write_mock_curl_status() {
  local status="$1"
  cat > "$MOCK_BIN/curl" <<EOF
#!/usr/bin/env bash
printf '\n%s' "$status"
EOF
  chmod +x "$MOCK_BIN/curl"
}

# Write a mock curl that records its args and returns a status code.
write_mock_curl_recording() {
  local status="$1"
  local call_log="$2"
  cat > "$MOCK_BIN/curl" <<EOF
#!/usr/bin/env bash
echo "\$@" >> "$call_log"
printf '\n%s' "$status"
EOF
  chmod +x "$MOCK_BIN/curl"
}

# Write a mock curl that exits non-zero (network error).
write_mock_curl_network_error() {
  cat > "$MOCK_BIN/curl" <<'EOF'
#!/usr/bin/env bash
exit 6
EOF
  chmod +x "$MOCK_BIN/curl"
}

# Write a valid config file.
write_valid_config() {
  mkdir -p -m 0700 "$HOME/.df-factory"
  printf '{"apiKey":"sk_live_abc123","baseUrl":"https://prime-factory.example.com"}\n' \
    > "$HOME/.df-factory/config.json"
  chmod 0600 "$HOME/.df-factory/config.json"
}

# ═════════════════════════════════════════════════════════════════════════════
# P-01: df-onboard.sh happy path
# ═════════════════════════════════════════════════════════════════════════════

@test "P-01: happy path — config written with correct apiKey and baseUrl" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "200" "$call_log"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  [ -f "$HOME/.df-factory/config.json" ]

  local api_key base_url
  api_key="$(jq -r '.apiKey' "$HOME/.df-factory/config.json")"
  base_url="$(jq -r '.baseUrl' "$HOME/.df-factory/config.json")"

  [ "$api_key" = "sk_live_abc123" ]
  [ "$base_url" = "https://prime-factory.example.com" ]
}

@test "P-01: happy path — success message printed to stdout" {
  write_mock_curl_status "200"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Onboarding complete. You're connected to https://prime-factory.example.com."
}

@test "P-01: happy path — config file has permission 0600" {
  write_mock_curl_status "200"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  local perms
  perms="$(stat -f '%A' "$HOME/.df-factory/config.json" 2>/dev/null \
    || stat -c '%a' "$HOME/.df-factory/config.json" 2>/dev/null)"
  [ "$perms" = "600" ]
}

@test "P-01: happy path — directory has permission 0700" {
  write_mock_curl_status "200"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  local perms
  perms="$(stat -f '%A' "$HOME/.df-factory" 2>/dev/null \
    || stat -c '%a' "$HOME/.df-factory" 2>/dev/null)"
  [ "$perms" = "700" ]
}

@test "P-01: happy path — curl called with correct URL, auth header, content-type, and body" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "200" "$call_log"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  grep -q "https://prime-factory.example.com/api/v1/installs/activate" "$call_log"
  grep -q "Authorization: Bearer sk_live_abc123" "$call_log"
  grep -q "Content-Type: application/json" "$call_log"
  grep -q "computerName" "$call_log"
  grep -q "gitUserId" "$call_log"
}

@test "P-01: happy path — gitUserId is alice@example.com from git config user.email" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "200" "$call_log"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  grep -q "alice@example.com" "$call_log"
}

# ═════════════════════════════════════════════════════════════════════════════
# P-02: df-check-onboard.sh passes with valid config
# ═════════════════════════════════════════════════════════════════════════════

@test "P-02: check-onboard passes — exit 0 with no output when config is valid" {
  write_valid_config

  run bash cli-lib/df-check-onboard.sh

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "P-02: check-onboard makes no network call (curl not invoked)" {
  write_valid_config

  # Place a curl that records any invocation
  local call_log="$HOME/curl-calls.log"
  cat > "$MOCK_BIN/curl" <<EOF
#!/usr/bin/env bash
echo "curl was called" >> "$call_log"
exit 1
EOF
  chmod +x "$MOCK_BIN/curl"

  run bash cli-lib/df-check-onboard.sh

  [ "$status" -eq 0 ]
  [ ! -f "$call_log" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# P-03: df-check-onboard.sh fails — missing or incomplete config
# ═════════════════════════════════════════════════════════════════════════════

@test "P-03: check-onboard fails — config file missing, exit 1 with message" {
  run bash cli-lib/df-check-onboard.sh

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "DF is not configured. Run df-onboard.sh first."
}

@test "P-03: check-onboard fails — config exists but apiKey missing, exit 1 with message" {
  mkdir -p "$HOME/.df-factory"
  printf '{"baseUrl":"https://prime-factory.example.com"}\n' \
    > "$HOME/.df-factory/config.json"

  run bash cli-lib/df-check-onboard.sh

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "DF is not configured. Run df-onboard.sh first."
}

@test "P-03: check-onboard fails — config exists but baseUrl missing, exit 1 with message" {
  mkdir -p "$HOME/.df-factory"
  printf '{"apiKey":"sk_live_abc123"}\n' \
    > "$HOME/.df-factory/config.json"

  run bash cli-lib/df-check-onboard.sh

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "DF is not configured. Run df-onboard.sh first."
}

@test "P-03: check-onboard fails — malformed JSON config treated as missing fields" {
  mkdir -p "$HOME/.df-factory"
  printf 'THIS IS NOT JSON }{[\n' > "$HOME/.df-factory/config.json"

  run bash cli-lib/df-check-onboard.sh

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "DF is not configured. Run df-onboard.sh first."
}

# ═════════════════════════════════════════════════════════════════════════════
# P-04: df-onboard.sh revoked key (HTTP 403)
# ═════════════════════════════════════════════════════════════════════════════

@test "P-04: HTTP 403 — exit 1 with revoked-key message, no config written" {
  write_mock_curl_status "403"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_revoked_xyz
INPUT

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "API key has been revoked. Ask your admin for a new key."
  [ ! -f "$HOME/.df-factory/config.json" ]
}

@test "P-04: HTTP 401 — exit 1 with expired-key message, no config written" {
  write_mock_curl_status "401"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_expired_xyz
INPUT

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "Invalid or expired API key. Check the key or ask your admin for a new one."
  [ ! -f "$HOME/.df-factory/config.json" ]
}

@test "P-04: network error — exit 1 with connect-failed message, no config written" {
  write_mock_curl_network_error

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "Failed to connect to https://prime-factory.example.com. Check the URL and try again."
  [ ! -f "$HOME/.df-factory/config.json" ]
}

@test "P-04: HTTP 400 — treated as generic failure, exit 1, no config written" {
  write_mock_curl_status "400"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "Failed to connect to https://prime-factory.example.com. Check the URL and try again."
  [ ! -f "$HOME/.df-factory/config.json" ]
}

# ═════════════════════════════════════════════════════════════════════════════
# P-05: df-onboard.sh re-run prompt
# ═════════════════════════════════════════════════════════════════════════════

@test "P-05: re-onboard prompt — answering N exits 0 silently, config unchanged" {
  write_valid_config

  run bash cli-lib/df-onboard.sh <<'INPUT'
N
INPUT

  [ "$status" -eq 0 ]
  # No success or error message on stdout (prompt text on stderr is acceptable)
  ! echo "$output" | grep -q "Onboarding complete"
  ! echo "$output" | grep -q "Invalid"
  ! echo "$output" | grep -q "revoked"
  ! echo "$output" | grep -q "Failed to connect"

  # Config must be unchanged
  local api_key
  api_key="$(jq -r '.apiKey' "$HOME/.df-factory/config.json")"
  [ "$api_key" = "sk_live_abc123" ]
}

@test "P-05: re-onboard prompt — pressing Enter (empty) exits 0 silently, config unchanged" {
  write_valid_config

  run bash cli-lib/df-onboard.sh <<'INPUT'

INPUT

  [ "$status" -eq 0 ]
  # No success or error message on stdout (prompt text on stderr is acceptable)
  ! echo "$output" | grep -q "Onboarding complete"
  ! echo "$output" | grep -q "Invalid"
  ! echo "$output" | grep -q "revoked"
  ! echo "$output" | grep -q "Failed to connect"

  local api_key
  api_key="$(jq -r '.apiKey' "$HOME/.df-factory/config.json")"
  [ "$api_key" = "sk_live_abc123" ]
}

@test "P-05: re-onboard prompt — answering y proceeds, config overwritten on success" {
  write_valid_config
  write_mock_curl_status "200"

  run bash cli-lib/df-onboard.sh <<'INPUT'
y
https://new-server.example.com
sk_live_new
INPUT

  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Onboarding complete. You're connected to https://new-server.example.com."

  local api_key base_url
  api_key="$(jq -r '.apiKey' "$HOME/.df-factory/config.json")"
  base_url="$(jq -r '.baseUrl' "$HOME/.df-factory/config.json")"
  [ "$api_key" = "sk_live_new" ]
  [ "$base_url" = "https://new-server.example.com" ]
}

@test "P-05: re-onboard prompt — answering Y (uppercase) also proceeds" {
  write_valid_config
  write_mock_curl_status "200"

  run bash cli-lib/df-onboard.sh <<'INPUT'
Y
https://new-server.example.com
sk_live_new
INPUT

  [ "$status" -eq 0 ]
  echo "$output" | grep -q "Onboarding complete."
}

# ═════════════════════════════════════════════════════════════════════════════
# Additional: URL validation and trailing slash normalization
# ═════════════════════════════════════════════════════════════════════════════

@test "URL without http/https scheme — exit 1 with invalid URL message" {
  run bash cli-lib/df-onboard.sh <<'INPUT'
ftp://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "Invalid URL. Must start with http:// or https://."
}

@test "URL with trailing slashes — stripped before network call and config write" {
  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "200" "$call_log"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com///
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  grep -q "https://prime-factory.example.com/api/v1/installs/activate" "$call_log"
  # Must not have double slash in the recorded call
  ! grep -q "example.com//api" "$call_log"

  local base_url
  base_url="$(jq -r '.baseUrl' "$HOME/.df-factory/config.json")"
  [ "$base_url" = "https://prime-factory.example.com" ]
}

@test "empty API key — exit 1 with empty-key message, no network call" {
  local call_log="$HOME/curl-calls.log"
  cat > "$MOCK_BIN/curl" <<EOF
#!/usr/bin/env bash
echo "curl was called" >> "$call_log"
EOF
  chmod +x "$MOCK_BIN/curl"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com

INPUT

  [ "$status" -eq 1 ]
  echo "$output" | grep -q "API key cannot be empty."
  [ ! -f "$call_log" ]
}

@test "gitUserId fallback — email empty, falls back to git name" {
  # Override git mock: no email, has name
  cat > "$MOCK_BIN/git" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "config" ] && [ "$2" = "user.email" ]; then
  echo ""
elif [ "$1" = "config" ] && [ "$2" = "user.name" ]; then
  echo "Alice Smith"
fi
EOF
  chmod +x "$MOCK_BIN/git"

  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "200" "$call_log"

  run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  grep -q "Alice Smith" "$call_log"
}

@test "gitUserId fallback — both email and name empty, falls back to \$USER" {
  # Override git mock: no email, no name
  cat > "$MOCK_BIN/git" <<'EOF'
#!/usr/bin/env bash
echo ""
EOF
  chmod +x "$MOCK_BIN/git"

  local call_log="$HOME/curl-calls.log"
  write_mock_curl_recording "200" "$call_log"

  USER="testuser" run bash cli-lib/df-onboard.sh <<'INPUT'
https://prime-factory.example.com
sk_live_abc123
INPUT

  [ "$status" -eq 0 ]
  grep -q "testuser" "$call_log"
}

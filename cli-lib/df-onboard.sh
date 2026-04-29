#!/usr/bin/env bash
# cli-lib/df-onboard.sh
# Interactive onboarding: validates credentials with the server, writes
# ~/.df-factory/config.json on success.

# ── Constants ────────────────────────────────────────────────────────────────
DF_DIR="$HOME/.df-factory"
CONFIG_FILE="$DF_DIR/config.json"

# ── Re-onboard guard ─────────────────────────────────────────────────────────
if [ -f "$CONFIG_FILE" ]; then
  printf 'Config already exists. Re-onboard? [y/N] ' >&2
  read -r REONBOARD_ANSWER
  case "$REONBOARD_ANSWER" in
    y|Y) ;;
    *) exit 0 ;;
  esac
fi

# ── Prompt for server URL ────────────────────────────────────────────────────
printf 'Enter the server URL (e.g. https://prime-factory.example.com): ' >&2
read -r BASE_URL

# Strip all trailing slashes
while [ "${BASE_URL%/}" != "$BASE_URL" ]; do
  BASE_URL="${BASE_URL%/}"
done

# Validate scheme
case "$BASE_URL" in
  http://*|https://*) ;;
  *)
    echo "Invalid URL. Must start with http:// or https://."
    exit 1
    ;;
esac

# ── Prompt for API key ───────────────────────────────────────────────────────
printf 'Enter your API key: ' >&2
read -r API_KEY

if [ -z "$API_KEY" ]; then
  echo "API key cannot be empty."
  exit 1
fi

# ── Collect machine identity ─────────────────────────────────────────────────
COMPUTER_NAME="$(hostname 2>/dev/null)"

# gitUserId fallback chain: email → name → $USER
GIT_USER_ID="$(git config user.email 2>/dev/null)"
if [ -z "$GIT_USER_ID" ]; then
  GIT_USER_ID="$(git config user.name 2>/dev/null)"
fi
if [ -z "$GIT_USER_ID" ]; then
  GIT_USER_ID="$USER"
fi

# ── Build request body ───────────────────────────────────────────────────────
REQUEST_BODY="{\"computerName\":\"${COMPUTER_NAME}\",\"gitUserId\":\"${GIT_USER_ID}\"}"

# ── Call activation endpoint ─────────────────────────────────────────────────
ACTIVATE_URL="${BASE_URL}/api/v1/installs/activate"

RESPONSE="$(curl \
  --silent \
  --max-time 10 \
  -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY" \
  "$ACTIVATE_URL" 2>/dev/null)"
CURL_EXIT=$?

# Split body and http_code on the last newline
HTTP_CODE="$(printf '%s' "$RESPONSE" | tail -n1)"

# ── Handle curl failure ──────────────────────────────────────────────────────
if [ $CURL_EXIT -ne 0 ] || [ -z "$HTTP_CODE" ]; then
  echo "Failed to connect to ${BASE_URL}. Check the URL and try again."
  exit 1
fi

# ── Handle HTTP response codes ───────────────────────────────────────────────
case "$HTTP_CODE" in
  200|2*)
    # Success — write config
    ;;
  401)
    echo "Invalid or expired API key. Check the key or ask your admin for a new one."
    exit 1
    ;;
  403)
    echo "API key has been revoked. Ask your admin for a new key."
    exit 1
    ;;
  *)
    echo "Failed to connect to ${BASE_URL}. Check the URL and try again."
    exit 1
    ;;
esac

# ── Write config ─────────────────────────────────────────────────────────────
mkdir -p -m 0700 "$DF_DIR" 2>/dev/null || true

CONFIG_JSON="{\"apiKey\":\"${API_KEY}\",\"baseUrl\":\"${BASE_URL}\"}"

# Write atomically via temp file
TMP_CONFIG="$(mktemp "${DF_DIR}/.config-tmp.XXXXXXXX" 2>/dev/null)"
printf '%s\n' "$CONFIG_JSON" > "$TMP_CONFIG"
chmod 0600 "$TMP_CONFIG"
mv "$TMP_CONFIG" "$CONFIG_FILE"

echo "Onboarding complete. You're connected to ${BASE_URL}."
exit 0

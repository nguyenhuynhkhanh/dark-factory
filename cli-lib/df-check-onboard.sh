#!/usr/bin/env bash
# cli-lib/df-check-onboard.sh
# Offline guard: checks that ~/.df-factory/config.json exists and contains
# non-empty apiKey and baseUrl fields.  No network call is made.
# Exit 0 with no output on success; exit 1 with message on failure.

# ── Constants ────────────────────────────────────────────────────────────────
CONFIG_FILE="$HOME/.df-factory/config.json"

# ── Check config file exists ─────────────────────────────────────────────────
if [ ! -f "$CONFIG_FILE" ]; then
  echo "DF is not configured. Run df-onboard.sh first."
  exit 1
fi

# ── Check required fields (grep/sed extraction) ───────────────────────────────
# grep pattern includes the opening quote to ensure the value is a quoted string
# (rejects null, numbers, booleans which would otherwise partially match)
API_KEY="$(grep '"apiKey"[[:space:]]*:[[:space:]]*"' "$CONFIG_FILE" | sed 's|.*"apiKey"[[:space:]]*:[[:space:]]*"||;s|".*||')"
if [ -z "$API_KEY" ]; then
  echo "DF is not configured. Run df-onboard.sh first."
  exit 1
fi

BASE_URL="$(grep '"baseUrl"[[:space:]]*:[[:space:]]*"' "$CONFIG_FILE" | sed 's|.*"baseUrl"[[:space:]]*:[[:space:]]*"||;s|".*||')"
if [ -z "$BASE_URL" ]; then
  echo "DF is not configured. Run df-onboard.sh first."
  exit 1
fi

exit 0

#!/usr/bin/env bash
# cli-lib/log-event.sh
# Fire-and-forget: posts a JSON event to POST /api/v1/events.
# Handles offline conditions by queuing events locally and flushing on next call.
# Never produces output, never exits non-zero.

exec >/dev/null 2>&1

# ── Constants ────────────────────────────────────────────────────────────────
CONFIG_FILE="$HOME/.df-factory/config.json"
QUEUE_FILE="$HOME/.df-factory/event-queue.json"
LOCK_FILE="$HOME/.df-factory/event-queue.lock"
LOCK_DIR="$HOME/.df-factory/event-queue.lock.d"
DF_DIR="$HOME/.df-factory"

# ── Prerequisite checks ───────────────────────────────────────────────────────
command -v curl >/dev/null 2>&1 || exit 0

# ── Argument validation ───────────────────────────────────────────────────────
PAYLOAD="$1"
[ -z "$PAYLOAD" ] && exit 0

# ── Read config ───────────────────────────────────────────────────────────────
[ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ] || exit 0

API_KEY="$(grep '"apiKey"[[:space:]]*:[[:space:]]*"' "$CONFIG_FILE" | sed 's|.*"apiKey"[[:space:]]*:[[:space:]]*"||;s|".*||')"
[ -z "$API_KEY" ] && exit 0

BASE_URL="$(grep '"baseUrl"[[:space:]]*:[[:space:]]*"' "$CONFIG_FILE" | sed 's|.*"baseUrl"[[:space:]]*:[[:space:]]*"||;s|".*||')"
[ -z "$BASE_URL" ] && exit 0

# Normalize trailing slash
BASE_URL="${BASE_URL%/}"
ENDPOINT="${BASE_URL}/api/v1/events"

# ── Ensure directory exists ───────────────────────────────────────────────────
mkdir -p -m 0700 "$DF_DIR" 2>/dev/null || true
touch "$LOCK_FILE" 2>/dev/null || true

# ── flock availability ────────────────────────────────────────────────────────
HAS_FLOCK=0
command -v flock >/dev/null 2>&1 && HAS_FLOCK=1

# ── mkdir-based spin lock (fallback when flock is absent) ────────────────────
# acquire_lock: tries mkdir in a loop; gives up after ~5 s (proceeds unguarded)
acquire_lock() {
  local i=0
  while [ $i -lt 50 ]; do
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      return 0
    fi
    sleep 0.1
    i=$((i + 1))
  done
  # Could not acquire within 5 s — remove stale lock and proceed
  rmdir "$LOCK_DIR" 2>/dev/null || true
  mkdir "$LOCK_DIR" 2>/dev/null || true
  return 0
}

release_lock() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

# ── Helper: run a block under lock ───────────────────────────────────────────
# Usage:  run_locked <command and args...>
# For flock we use fd 200 on $LOCK_FILE.
# For mkdir fallback we spin on $LOCK_DIR.
run_locked() {
  if [ "$HAS_FLOCK" -eq 1 ]; then
    ( flock -x 200; "$@" ) 200>>"$LOCK_FILE" 2>/dev/null
  else
    acquire_lock
    "$@"
    release_lock
  fi
}

# ── Helper: extract events array contents from queue file ────────────────────
# Returns newline-separated JSON event objects, or empty string if none/corrupt.
# The queue file is a single line: {"version":1,"events":[...]}
# We validate version=1, then extract the array body between the outermost [ and ]
# of the "events" value.
read_queue_events() {
  if [ ! -f "$QUEUE_FILE" ]; then
    printf ''
    return
  fi

  local raw
  raw="$(cat "$QUEUE_FILE" 2>/dev/null)"

  if [ -z "$raw" ]; then
    printf ''
    return
  fi

  # Collapse multi-line JSON to a single line so sed/grep can process the
  # full structure in one pass (handles both our compact format and pretty-printed input)
  local oneline
  oneline="$(printf '%s' "$raw" | tr -d '\n')"

  # Version check: must contain "version":1
  if ! printf '%s' "$oneline" | grep -q '"version"[[:space:]]*:[[:space:]]*1'; then
    printf ''
    return
  fi

  # Structural integrity check: the string must end with ]} (possible whitespace)
  # This detects truncated/corrupt files that were cut off mid-write
  if ! printf '%s' "$oneline" | grep -q '\][[:space:]]*}[[:space:]]*$'; then
    printf ''
    return
  fi

  # Extract the events array body: strip up to and including "events":[ then strip trailing ]}
  local events_body
  events_body="$(printf '%s' "$oneline" | sed 's|.*"events"[[:space:]]*:[[:space:]]*\[||;s|\][[:space:]]*}[[:space:]]*$||')"

  # If events_body is empty, the array was empty — return empty
  if [ -z "$events_body" ]; then
    printf ''
    return
  fi

  # Verify we actually have array content (not just the envelope with no events key)
  # If the substitution didn't work (no "events" key), events_body equals oneline — detect that
  if printf '%s' "$events_body" | grep -q '"version"'; then
    # Substitution failed — treat as corrupt
    printf ''
    return
  fi

  # events_body is now the comma-separated list of JSON event objects (possibly with spaces)
  # Split into one-per-line by tracking brace depth with awk
  # Each event object is {"queuedAt":"...","payload":{...}}
  printf '%s' "$events_body" | awk '
  {
    # Split on the boundary between consecutive objects: },{ or }, {
    # We accumulate characters and emit when we close an outermost object
    depth = 0
    current = ""
    n = split($0, chars, "")
    for (i = 1; i <= n; i++) {
      c = chars[i]
      current = current c
      if (c == "{") depth++
      else if (c == "}") {
        depth--
        if (depth == 0) {
          print current
          current = ""
          # skip any comma or whitespace between objects
          while (i < n && (chars[i+1] == "," || chars[i+1] == " ")) i++
        }
      }
    }
    if (current != "" && current != ",") print current
  }'
}

# ── Helper: write queue events (newline-separated objects) back to disk ───────
# Argument: $1 = newline-separated JSON event objects (empty string = no events)
write_queue_events() {
  local events_lines="$1"

  # Count non-empty lines
  local count
  if [ -z "$events_lines" ]; then
    count=0
  else
    count="$(printf '%s\n' "$events_lines" | grep -c '.'  2>/dev/null || true)"
  fi

  if [ "${count:-0}" -eq 0 ]; then
    rm -f "$QUEUE_FILE" 2>/dev/null || true
    return
  fi

  # Build the JSON array from the newline-separated objects
  local events_json
  events_json="$(printf '%s\n' "$events_lines" | awk '
  NF > 0 {
    if (NR > 1) printf ","
    printf "%s", $0
  }
  END { printf "" }
  ')"

  local tmp
  tmp="$(mktemp "$DF_DIR/.queue-tmp.XXXXXXXX" 2>/dev/null)" || return

  printf '{"version":1,"events":[%s]}\n' "$events_json" > "$tmp" 2>/dev/null
  chmod 0600 "$tmp" 2>/dev/null || true
  mv "$tmp" "$QUEUE_FILE" 2>/dev/null || rm -f "$tmp" 2>/dev/null || true
}

# ── Helper: append one event to queue (acquires own lock) ────────────────────
append_to_queue() {
  local payload="$1"
  local queued_at
  queued_at="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null)"
  local new_entry
  new_entry="$(printf '{"queuedAt":"%s","payload":%s}' "$queued_at" "$payload")"

  _do_append() {
    local current_events
    current_events="$(read_queue_events)"
    local updated
    if [ -z "$current_events" ]; then
      updated="$new_entry"
    else
      updated="$(printf '%s\n%s' "$current_events" "$new_entry")"
    fi
    write_queue_events "$updated"
  }

  run_locked _do_append
}

# ── Helper: send a single event via curl, return http_code or "network_error" ─
send_event() {
  local payload="$1"
  local http_code
  http_code="$(curl \
    --silent \
    --output /dev/null \
    --write-out "%{http_code}" \
    --max-time 5 \
    -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$ENDPOINT" 2>/dev/null)"
  local curl_exit=$?

  if [ $curl_exit -ne 0 ]; then
    echo "network_error"
    return
  fi

  echo "$http_code"
}

# ── Phase 1: Read queue under lock ───────────────────────────────────────────
_do_read_queue() {
  read_queue_events
}

QUEUED_EVENTS="$(run_locked _do_read_queue)"

# ── Phase 2: Flush queued events (no lock held) ───────────────────────────────
SURVIVORS=""

if [ -n "$QUEUED_EVENTS" ]; then
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue

    # Extract payload: strip outer {"queuedAt":"...","payload": and trailing }
    # The payload value is everything after "payload": to the last }
    entry_payload="$(printf '%s' "$entry" | sed 's|.*"payload"[[:space:]]*:||;s|}[[:space:]]*$||')"

    if [ -z "$entry_payload" ] || [ "$entry_payload" = "null" ]; then
      continue
    fi

    code="$(send_event "$entry_payload")"

    case "$code" in
      2*)
        # Success — drop from queue
        ;;
      network_error|5*)
        # Keep in queue
        if [ -z "$SURVIVORS" ]; then
          SURVIVORS="$entry"
        else
          SURVIVORS="$(printf '%s\n%s' "$SURVIVORS" "$entry")"
        fi
        ;;
      4*)
        # Terminal — drop
        ;;
      *)
        # Unknown — keep to be safe
        if [ -z "$SURVIVORS" ]; then
          SURVIVORS="$entry"
        else
          SURVIVORS="$(printf '%s\n%s' "$SURVIVORS" "$entry")"
        fi
        ;;
    esac
  done <<EOF
$QUEUED_EVENTS
EOF
fi

# ── Phase 3: Write survivor queue back under lock ─────────────────────────────
_do_write_survivors() {
  write_queue_events "$SURVIVORS"
}

run_locked _do_write_survivors

# ── Send current event ────────────────────────────────────────────────────────
CURRENT_CODE="$(send_event "$PAYLOAD")"

case "$CURRENT_CODE" in
  2*)
    # Delivered — nothing to do
    ;;
  network_error|5*)
    # Queue for retry
    append_to_queue "$PAYLOAD"
    ;;
  4*)
    # Terminal — drop
    ;;
  *)
    # Unknown — queue to be safe
    append_to_queue "$PAYLOAD"
    ;;
esac

exit 0

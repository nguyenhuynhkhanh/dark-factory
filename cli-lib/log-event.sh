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
command -v jq   >/dev/null 2>&1 || exit 0

# ── Argument validation ───────────────────────────────────────────────────────
PAYLOAD="$1"
[ -z "$PAYLOAD" ] && exit 0

# ── Read config ───────────────────────────────────────────────────────────────
[ -f "$CONFIG_FILE" ] && [ -r "$CONFIG_FILE" ] || exit 0

API_KEY="$(jq -r '.apiKey // empty' "$CONFIG_FILE" 2>/dev/null)"
[ -z "$API_KEY" ] && exit 0

BASE_URL="$(jq -r '.baseUrl // empty' "$CONFIG_FILE" 2>/dev/null)"
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

# ── Helper: read queue (returns JSON array of events) ────────────────────────
read_queue_events() {
  if [ ! -f "$QUEUE_FILE" ]; then
    echo "[]"
    return
  fi

  local raw
  raw="$(cat "$QUEUE_FILE" 2>/dev/null)"

  if [ -z "$raw" ]; then
    echo "[]"
    return
  fi

  local ver
  ver="$(echo "$raw" | jq -r '.version // empty' 2>/dev/null)"
  if [ "$ver" != "1" ]; then
    echo "[]"
    return
  fi

  local events
  events="$(echo "$raw" | jq -c '.events // empty' 2>/dev/null)"
  if [ -z "$events" ]; then
    echo "[]"
    return
  fi

  local type
  type="$(echo "$events" | jq -r 'type' 2>/dev/null)"
  if [ "$type" != "array" ]; then
    echo "[]"
    return
  fi

  echo "$events"
}

# ── Helper: write queue events array back to disk ─────────────────────────────
write_queue_events() {
  local events_json="$1"

  local count
  count="$(echo "$events_json" | jq 'length' 2>/dev/null)"
  if [ "$count" = "0" ]; then
    rm -f "$QUEUE_FILE" 2>/dev/null || true
    return
  fi

  local tmp
  tmp="$(mktemp "$DF_DIR/.queue-tmp.XXXXXXXX" 2>/dev/null)" || return

  printf '{"version":1,"events":%s}\n' "$events_json" > "$tmp" 2>/dev/null
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
    updated="$(printf '%s\n%s' "$current_events" "$new_entry" | jq -cs '.[0] + [.[1]]' 2>/dev/null)"
    [ -z "$updated" ] && updated="[$new_entry]"
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
[ -z "$QUEUED_EVENTS" ] && QUEUED_EVENTS="[]"

# ── Phase 2: Flush queued events (no lock held) ───────────────────────────────
QUEUE_LEN="$(echo "$QUEUED_EVENTS" | jq 'length' 2>/dev/null)"
QUEUE_LEN="${QUEUE_LEN:-0}"

SURVIVORS="[]"

if [ "$QUEUE_LEN" -gt 0 ]; then
  i=0
  while [ "$i" -lt "$QUEUE_LEN" ]; do
    entry="$(echo "$QUEUED_EVENTS" | jq -c ".[$i]" 2>/dev/null)"
    entry_payload="$(echo "$entry" | jq -c '.payload' 2>/dev/null)"

    if [ -z "$entry_payload" ] || [ "$entry_payload" = "null" ]; then
      i=$((i + 1))
      continue
    fi

    code="$(send_event "$entry_payload")"

    case "$code" in
      2*)
        # Success — drop from queue
        ;;
      network_error|5*)
        # Keep in queue
        SURVIVORS="$(printf '%s\n%s' "$SURVIVORS" "$entry" | jq -cs '.[0] + [.[1]]' 2>/dev/null)"
        [ -z "$SURVIVORS" ] && SURVIVORS="[$entry]"
        ;;
      4*)
        # Terminal — drop
        ;;
      *)
        # Unknown — keep to be safe
        SURVIVORS="$(printf '%s\n%s' "$SURVIVORS" "$entry" | jq -cs '.[0] + [.[1]]' 2>/dev/null)"
        [ -z "$SURVIVORS" ] && SURVIVORS="[$entry]"
        ;;
    esac

    i=$((i + 1))
  done
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

# Feature: CLI Event Logging with Offline Queue

## Context

The Dark Factory CLI (`df-*` slash commands) runs on developers' local machines via the Claude Code Bash tool. Until now, no telemetry is emitted from these commands, so CTOs have no visibility into pipeline activity: which commands ran, how long they took, what outcomes were produced, or which sub-agents fired.

This feature introduces a lightweight bash script — `cli-lib/log-event.sh` — that every `df-*` skill calls to post a structured JSON event to `POST /api/v1/events`. The server endpoint already exists and requires no changes. The script handles offline conditions gracefully by queuing events locally and flushing them on the next call.

The script is fire-and-forget: it must never block the developer's workflow, never produce output, and never fail visibly.

---

## Scope

### In Scope (this spec)

- `cli-lib/log-event.sh` — main bash implementation
- `~/.df-factory/config.json` — config file read by the script (not created by this spec; created by `df-onboard`)
- `~/.df-factory/event-queue.json` — local offline queue managed entirely by this script
- Queue flush: send queued events before the current event on each invocation
- File locking with `flock` to prevent concurrent queue corruption
- Silent error handling: all errors are swallowed; script always exits 0
- `cli-lib/tests/log-event.bats` — bats-core test suite
- `package.json` — add `"test": "bats cli-lib/tests/"` script

### Out of Scope (explicitly deferred)

- Retry backoff, max queue depth, or event TTL — the queue grows unbounded in v1; this is an accepted limitation
- Batching endpoint on the server — events are sent one at a time
- SIGINT / SIGTERM handler for logging an `abandoned` outcome on Ctrl-C
- Per-worktree queue isolation — all worktrees on a machine share `~/.df-factory/event-queue.json`
- Any output to the developer (stdout, stderr, notifications)
- Changes to `POST /api/v1/events` — the server contract is frozen

### Scaling Path

If event volume grows and sequential flushing becomes a bottleneck, the queue can be batch-posted to a future `/api/v1/events/batch` endpoint without changing the queue file format (the `events` array maps directly). The `version: 1` field in the queue schema is a forward-compatibility hook.

---

## Requirements

### Functional

- FR-1: The script accepts a single positional argument: a JSON string representing the event payload. No other arguments are accepted.
- FR-2: On each invocation, the script reads `apiKey` and `baseUrl` from `~/.df-factory/config.json` before attempting to send anything.
- FR-3: If the config file is absent, unreadable, or `apiKey` is empty or missing, the script silently drops the event and exits 0. No queue write occurs.
- FR-4: The script attempts to flush the offline queue before sending the current event, so that queued events reach the server in temporal order.
- FR-5: The script sends events via `curl` with a 5-second connect+transfer timeout, using `Authorization: Bearer {apiKey}` and `Content-Type: application/json`.
- FR-6: On HTTP 2xx from the server, the event is considered delivered. No side effects.
- FR-7: On HTTP 4xx (including 401, 400), the event is silently dropped. It is NOT written to the queue. 4xx responses are terminal — they will never succeed on retry.
- FR-8: On any network error (curl non-zero exit) OR HTTP 5xx, the event is appended to the offline queue for retry on the next invocation.
- FR-9: The queue file format is: `{ "version": 1, "events": [ { "queuedAt": "<ISO 8601>", "payload": { ... } } ] }`.
- FR-10: If `~/.df-factory/` directory does not exist, the script creates it with `mkdir -p -m 0700` before writing the queue file. The queue file must be written with permissions `0600` to restrict access to the owning user (the directory contains the API key in `config.json`).
- FR-11: All queue read and write operations must be protected by an exclusive `flock` lock on a dedicated lock file `~/.df-factory/event-queue.lock` (never renamed or replaced). The pattern is `( flock -x 200; <operations> ) 200>>"$LOCK_FILE"`. The queue **data** file (`event-queue.json`) must NOT be the flock target, because the atomic `mv` rename creates a new inode and silently breaks mutual exclusion for subsequent openers. Two-phase locking is required: (1) lock → read queue into memory → unlock; (2) perform all curl calls without holding the lock; (3) lock → write updated queue → unlock.
- FR-12: If the queue file exists but contains invalid JSON OR has a `version` field that is not `1`, the script treats it as empty and resets it. Corrupted data and unknown future formats are discarded rather than blocking delivery.
- FR-13: On flush, the script iterates over queued events and attempts to POST each one individually. Events that succeed are removed. Events that fail (network error or 5xx) are kept. Events that receive 4xx during flush are dropped (not re-queued).
- FR-14: The script must produce zero output on stdout and stderr under all conditions, including errors.
- FR-15: The script must always exit with code 0, including on all error paths.
- FR-16: The script must complete within 2 seconds in the common case (single event, empty queue). Large queues may take longer due to sequential flushing; this is an accepted v1 limitation.

### Non-Functional

- NFR-1: The script must have no runtime dependencies beyond `curl`, `jq`, and standard POSIX/bash utilities (`flock`, `mktemp`, `date`). These are assumed present in the developer environment.
- NFR-2: The script must be POSIX-compatible bash (`#!/usr/bin/env bash`). No bash 4+ array features that fail on macOS default bash (3.2). Note: `flock` IS available on macOS via `util-linux` (homebrew) and is standard on Linux. If `flock` is not installed, the script falls back to unguarded writes (check `command -v flock`). This is a known limitation on bare macOS installs — concurrent queue safety requires Homebrew `util-linux`.
- NFR-3: Tests use bats-core. Install instructions must be documented in `package.json` (as a comment or in a README note). The `test` script runs `bats cli-lib/tests/`.

---

## Data Model

No server-side schema changes. The server already stores events in the `events` table.

### Local queue file: `~/.df-factory/event-queue.json`

```json
{
  "version": 1,
  "events": [
    {
      "queuedAt": "2026-04-07T12:00:00.000Z",
      "payload": {
        "command": "df-intake",
        "startedAt": "2026-04-07T11:59:58.000Z",
        "sessionId": "uuid-here"
      }
    }
  ]
}
```

- `version`: always `1` in this implementation. Reserved for future format migrations.
- `events[].queuedAt`: ISO 8601 UTC timestamp set at the moment of queuing.
- `events[].payload`: the raw JSON payload the script was called with (verbatim, not re-serialized).

---

## Migration & Deployment

N/A — no existing data affected. This script creates new files in `~/.df-factory/` on the developer's machine. There are no server-side schema changes. The `~/.df-factory/config.json` file pre-exists from `df-onboard`; this script only reads it.

---

## API Endpoint (consumed, not modified)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `{baseUrl}/api/v1/events` | Ingest a CLI telemetry event | `Authorization: Bearer {apiKey}` |

### Request body fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `command` | string | Yes | One of: `df-intake`, `df-debug`, `df-orchestrate`, `df-onboard`, `df-cleanup` |
| `startedAt` | ISO 8601 string | Yes | When the command or sub-agent started |
| `subcommand` | string | No | e.g. `spec-lead-spawned`, `code-agent-done` |
| `endedAt` | ISO 8601 string | No | |
| `durationMs` | number (≥ 0) | No | |
| `outcome` | string | No | One of: `success`, `failed`, `blocked`, `abandoned` |
| `featureName` | string | No | |
| `roundCount` | integer (≥ 0) | No | |
| `promptText` | string | No | Truncated server-side to 64 KB |
| `sessionId` | string | No | UUID, same for all events in a workflow run |

### Responses

| Status | Body | Script action |
|--------|------|---------------|
| 201 | `{ "ok": true, "id": "<uuid>" }` | Event delivered — no side effects |
| 400 | `{ "error": "..." }` | Drop event — do NOT queue |
| 401 | `{ "error": "unauthorized" }` | Drop event — do NOT queue |
| 5xx | `{ "error": "..." }` | Queue event for retry |
| Network error | (no response) | Queue event for retry |

---

## Script Invocation

The script is called by df-* skills (and their sub-agents) with a single JSON argument:

```bash
cli-lib/log-event.sh '{"command":"df-intake","startedAt":"2026-04-07T12:00:00Z","sessionId":"uuid-here"}'
```

The script is called from the repository root. It reads its own path relative to the caller's working directory (or via `$BASH_SOURCE`). The path `cli-lib/log-event.sh` is a convention — callers must ensure the working directory is the repo root.

### Lifecycle call sites

Skill authors call `log-event.sh` at these points:

1. **Command start** — immediately on entry, before any agent is spawned. Fields: `command`, `startedAt`, `sessionId`.
2. **Sub-agent spawned** — once per sub-agent. Fields: `command`, `startedAt`, `subcommand` (e.g. `spec-lead-spawned`), `sessionId`.
3. **Command end** — on completion. Fields: `command`, `startedAt`, `endedAt`, `durationMs`, `outcome`, `sessionId`.

Sub-agents spawned by df-orchestrate: `architect-agent`, `code-agent`, `test-agent`, `promote-agent`.
Sub-agents spawned by df-intake: three `spec-lead` agents.
Sub-agents spawned by df-debug: one or more `debug-agent` instances.
Sub-agents spawned by df-onboard: `onboard-agent`.
Sub-agents spawned by df-cleanup: `cleanup-agent`.

---

## Business Rules

- BR-1: **No API key, no queue.** If the config file is absent or `apiKey` is empty, the event is silently dropped without touching the queue. Queuing without a key is useless since the queue can never be flushed.
- BR-2: **4xx is terminal.** HTTP 4xx responses (including auth failures and validation errors) represent permanent failures. These events will never succeed on retry. They must not be queued.
- BR-3: **5xx and network errors are transient.** These events must be queued for retry.
- BR-4: **Flush before send.** The current event is sent AFTER all queued events are attempted. This preserves temporal order in the CTO dashboard.
- BR-5: **Partial flush is acceptable.** On flush, events that succeed are removed; events that fail stay. The queue never grows beyond what genuinely cannot be delivered.
- BR-6: **Corrupted queue is reset.** If the queue file contains invalid JSON, the script discards it and treats the queue as empty. Blocking delivery indefinitely because of a corrupted file is worse than losing queued events.
- BR-7: **Exclusive locking required.** Because multiple sub-agents may call `log-event.sh` concurrently (e.g. df-orchestrate spawning architect-agent, code-agent, test-agent simultaneously), the queue file must be exclusively locked during file I/O. A **dedicated lock file** (`event-queue.lock`) must be used — never the queue data file itself — because atomic `mv` creates a new inode and breaks flock's mutual exclusion. The lock must only be held during file reads and writes, NOT during curl network calls (two-phase locking).
- BR-8: **Script never blocks the caller.** The script must exit 0 regardless of outcome. Any error (missing config, network down, malformed queue) is silently absorbed.
- BR-9: **queuedAt is set at queue time, not at event creation time.** The original `startedAt` in the payload is preserved verbatim; `queuedAt` records when the queuing happened.

---

## Error Handling

| Scenario | Script Behavior | Side Effects |
|----------|-----------------|--------------|
| Config file missing | Silent drop, exit 0 | None |
| Config file exists but `apiKey` field is empty string | Silent drop, exit 0 | None |
| Config file contains invalid JSON | Silent drop, exit 0 | None |
| `jq` not installed | Script should fail gracefully — wrap jq calls in a subshell; if command not found, silent drop | None |
| curl not installed | Silent drop, exit 0 | None |
| Network unreachable, curl exits non-zero | Append to queue, exit 0 | Queue grows |
| HTTP 5xx response | Append to queue, exit 0 | Queue grows |
| HTTP 4xx response | Drop event, exit 0 | None |
| HTTP 401 response | Drop event, exit 0 | None |
| Queue file corrupted (invalid JSON) | Reset queue to empty, proceed | Old queue entries lost |
| Queue file not writable | Script must handle write error gracefully, exit 0 | Current event dropped |
| `~/.df-factory/` directory missing | Create directory, then write queue | Directory created |
| Concurrent queue access (two agents simultaneously) | flock ensures one waits; no corruption | Serialized writes |
| Partial flush failure (some events succeed, some fail) | Remove succeeded entries, keep failed entries | Queue shrinks |
| 4xx received during flush of a queued event | Drop that queued event (do not re-queue) | Queue shrinks |

---

## Acceptance Criteria

- [ ] AC-1: Calling `log-event.sh` with a valid payload and reachable server results in `POST /api/v1/events` being called with the correct body and `Authorization: Bearer` header.
- [ ] AC-2: The script produces zero output on stdout and stderr in all scenarios (success, network error, missing config, corrupted queue).
- [ ] AC-3: The script always exits with code 0.
- [ ] AC-4: When the server is unreachable, the event is written to `~/.df-factory/event-queue.json` with `queuedAt` and `payload` fields.
- [ ] AC-5: On the next invocation after a queued event, the queued event is sent first, then the current event is sent.
- [ ] AC-6: Successfully flushed events are removed from the queue; failed ones remain.
- [ ] AC-7: Events that receive 4xx during flush are dropped, not re-queued.
- [ ] AC-8: A corrupted queue file is reset to empty without blocking the current event.
- [ ] AC-9: If `~/.df-factory/` does not exist, the script creates it before writing the queue.
- [ ] AC-10: The queue file is exclusively locked during read-modify-write operations.
- [ ] AC-11: With `apiKey` absent from config, no HTTP request is made and the queue is not written.
- [ ] AC-12: `npm test` runs the bats test suite successfully.

---

## Edge Cases

- EC-1: `~/.df-factory/config.json` exists but contains `{ "apiKey": "" }` — empty string. Must be treated as missing (BR-1). No request, no queue write.
- EC-2: `~/.df-factory/config.json` exists but contains `{ "apiKey": null }` — null value. Must be treated as missing.
- EC-3: `~/.df-factory/config.json` exists but `apiKey` key is absent entirely. Must be treated as missing.
- EC-4: Queue file exists with `{ "version": 1, "events": [] }` — empty events array. Flush is a no-op. Current event is sent normally.
- EC-5: Queue file exists but is an empty file (zero bytes). Must be treated as corrupted — reset to empty and proceed.
- EC-6: Queue file exists with valid JSON but not the expected schema (e.g. a plain array, or `{}`). Must be treated as corrupted — reset to empty.
- EC-7: Two invocations of `log-event.sh` happen at the exact same millisecond (parallel sub-agents). `flock` must serialize the queue write; neither event must be lost.
- EC-8: The queue contains 50 events. Flush sends them all before the current event. Only the current event fails (server returns 5xx). The queue now contains exactly 1 event (the current one).
- EC-9: During flush, event 3 of 5 receives a 5xx. Events 1 and 2 succeeded. The flush stops (or continues — either is acceptable) but the final queue contains events 3, 4, and 5 (unsent). The current event is then attempted.
- EC-10: `baseUrl` in config has a trailing slash. The script must not produce double-slashes in the URL (i.e. normalize the URL before calling curl, or ensure the path component starts without a leading slash conflict).
- EC-11: The payload JSON argument contains special characters (quotes, backslashes, newlines in `promptText`). The script must pass the payload verbatim to curl without double-encoding or stripping characters.
- EC-12: The script is called with no arguments. It must exit 0 silently. (Callers should always pass a payload, but a missing argument must not crash the script.)
- EC-13: The script is called while offline (DNS unreachable). Curl exits non-zero with connection refused or timeout. Event is queued.
- EC-14: On flush, a previously queued event receives a 4xx (e.g. the command field was somehow invalid). That entry is dropped; it does not block the rest of the flush.
- EC-15: If the developer's system clock is more than 1 hour ahead of real time, the server returns HTTP 400 for the `startedAt` field. Since 4xx → drop (never queue), events are permanently and silently lost. This is an accepted v1 limitation. No client-side clock validation is added.

---

## Dependencies

None — this spec is independently implementable.

The server endpoint (`POST /api/v1/events`) already exists at `app/api/v1/events/route.ts`. No changes to that file are required.

The config file (`~/.df-factory/config.json`) is created by `df-onboard`. This spec assumes it may or may not exist and handles both cases.

- **Depends on**: nothing
- **Depended on by**: nothing (df-* skills will call this script once it exists, but this spec does not modify the skills themselves)
- **Group**: cli-tooling

---

## Implementation Size Estimate

- **Scope size**: small (2 files modified or created: `cli-lib/log-event.sh`, `cli-lib/tests/log-event.bats`, plus a one-line change to `package.json`)
- **Suggested parallel tracks**: 1 — no parallelism needed
  - Track 1: Write `cli-lib/log-event.sh`, write `cli-lib/tests/log-event.bats`, update `package.json`

---

## Implementation Notes

- Use `#!/usr/bin/env bash` at the top. Set `set -euo pipefail` is NOT recommended here because the script must never exit non-zero — use explicit error handling instead.
- Redirect ALL output at the top of the script: `exec >/dev/null 2>&1`
- Use `curl --silent --output /dev/null --write-out "%{http_code}" --max-time 5` to capture only the HTTP status code.
- Use `jq -r '.apiKey // empty'` to extract the API key (returns empty string if absent or null).
- **flock pattern — use a dedicated lock file, never the queue data file:**
  ```bash
  LOCK_FILE="$HOME/.df-factory/event-queue.lock"
  QUEUE_FILE="$HOME/.df-factory/event-queue.json"
  # Phase 1: lock → read → unlock
  queued_events=$(flock -x "$LOCK_FILE" jq -c '.events // []' "$QUEUE_FILE" 2>/dev/null || echo '[]')
  # ... perform curl calls without holding lock ...
  # Phase 2: lock → write result → unlock
  ( flock -x 200; <write updated json to QUEUE_FILE via temp file> ) 200>>"$LOCK_FILE"
  ```
  Alternative one-liner form: `flock -x "$LOCK_FILE" bash -c '...'`
- **Two-phase locking is mandatory**: hold the lock only during file I/O, release it before any curl call. A 50-event queue × 5 s curl timeout would otherwise hold the lock for ~255 s.
- **Atomic write**: use `mktemp "$HOME/.df-factory/.queue-tmp.XXXXXXXX"` (same filesystem as queue file, not `/tmp`) then `mv` the temp file over the queue file. This ensures same-filesystem atomic rename.
- **Directory and file creation**: `mkdir -p -m 0700 "$HOME/.df-factory/"` and after writing the queue file set `chmod 0600 "$QUEUE_FILE"`.
- `date -u +"%Y-%m-%dT%H:%M:%S.000Z"` produces a compatible ISO 8601 timestamp on both macOS and Linux.
- The flush loop should collect all events into memory (under lock), release the lock, attempt curl for each event, track which indices failed, then re-acquire lock and write only the failed events back.
- **All variable expansions carrying user data** (`$PAYLOAD`, `$API_KEY`, event payload strings) must use double-quoted form in every `jq` and `curl` invocation to prevent word-splitting and shell injection.
- The bats test file should use `setup` to create a temp `HOME` directory so tests are hermetic and never touch the real `~/.df-factory/`. Override `HOME` in each test.

---

## Traceability

| Spec Item | Scenario(s) |
|-----------|-------------|
| FR-1 | P-01 |
| FR-2 | P-01, P-02, H-01 |
| FR-3 | P-02, H-01, H-02 |
| FR-4 | P-04, H-05 |
| FR-5 | P-01 |
| FR-6 | P-01 |
| FR-7 | P-03, H-03 |
| FR-8 | P-05, P-06 |
| FR-9 | P-05 |
| FR-10 | H-08 |
| FR-11 | H-09 |
| FR-12 | P-07, H-06 |
| FR-13 | P-04, H-05, H-07 |
| FR-14 | H-10 |
| FR-15 | H-10 |
| FR-16 | (NFR — covered implicitly by test speed) |
| BR-1 | P-02, H-01, H-02 |
| BR-2 | P-03, H-03 |
| BR-3 | P-05, P-06 |
| BR-4 | P-04 |
| BR-5 | H-05, H-07 |
| BR-6 | P-07, H-06 |
| BR-7 | H-09 |
| BR-8 | H-10 |
| BR-9 | P-05 |
| EC-1 | H-01 |
| EC-2 | H-02 |
| EC-3 | H-02 |
| EC-4 | P-04 |
| EC-5 | H-06 |
| EC-6 | H-06 |
| EC-7 | H-09 |
| EC-8 | H-07 |
| EC-9 | H-07 |
| EC-10 | H-11 |
| EC-11 | H-12 |
| EC-12 | H-13 |
| EC-13 | P-06 |
| EC-14 | H-03 |

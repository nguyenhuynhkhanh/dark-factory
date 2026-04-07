# Architect Review — cli-event-logging

## Status: APPROVED WITH NOTES

Blockers resolved by spec update (dedicated lock file, two-phase locking, mktemp same-filesystem, directory permissions, version field check, EC-15 documented).

---

## Blockers

### B-1: flock on queue data file is broken by atomic mv (Architecture)

The spec says to lock the queue file itself (`200>>"$QUEUE_FILE"`) while also using atomic rename (`mv tmp → $QUEUE_FILE`) to update it. `flock` locks an **inode**, not a path. After the first `mv`, the new file has a different inode; subsequent concurrent processes open the new path and get a new, separate inode. Mutual exclusion is silently destroyed. With df-orchestrate spawning 4 parallel sub-agents, two agents can corrupt the queue undetected.

**Fix**: Use a dedicated **`~/.df-factory/event-queue.lock`** file (never renamed or replaced) as the sole flock target. The data file (`event-queue.json`) is read and written normally — only the lock file provides mutual exclusion.

### B-2: Lock held across all curl network I/O blocks parallel agents (Architecture)

If the flush loop runs entirely inside the flock subshell, a queue of 50 events with 5 s curl timeouts holds the lock for ~255 s. Every other parallel sub-agent stalls for that entire window.

**Fix**: Two-phase locking — `lock → read queue → unlock → do all curl calls → lock → write updated queue → unlock`. The lock is held only during file I/O, not during network operations.

---

## Key Decisions Made

1. **Dedicated lock file**: `~/.df-factory/event-queue.lock` is the flock target. The queue data file is never the lock target.
2. **Two-phase lock**: Read queue under lock, release, do network I/O, re-acquire lock to write result.
3. **`mktemp` must use `~/.df-factory/` as prefix dir** (not `/tmp`) to guarantee same-filesystem atomic `mv`. Use `mktemp "$HOME/.df-factory/.queue-tmp.XXXXXXXX"`.
4. **Directory permissions**: `mkdir -p -m 0700 ~/.df-factory/` on creation; queue file written with `umask 077` or `chmod 0600`.
5. **`startedAt` future-time 400 → drop**: Document as an accepted limitation — a client clock >1 hr fast causes permanent silent event loss (not retried). Add a spec note.
6. **Queue version check**: On read, if `version` field is absent or != 1, treat as corrupted/reset (same as invalid JSON). The `version` field is only meaningful if it is actually checked.

---

## Remaining Notes

- Shell injection: All variable expansions that carry user data (`$PAYLOAD`, `$API_KEY`) must use double-quoted form in every `jq` and `curl` invocation.
- `flock` absent on macOS: without `util-linux` (Homebrew), `flock` is unavailable — the script should check `command -v flock` and fall back to unguarded writes (document as known limitation, not a crash).
- `baseUrl` trailing-slash normalization: `baseUrl="${baseUrl%/}"` before concatenation (already in spec as EC-10, confirm implementation).
- `endedAt >= startedAt` is validated server-side — the client need not re-validate, but should not send `endedAt < startedAt`.

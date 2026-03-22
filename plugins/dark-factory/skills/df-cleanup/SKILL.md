---
name: df-cleanup
description: "Recovery and maintenance for Dark Factory lifecycle. Retries stuck promotions, completes archival, and lists stale features."
---

# Dark Factory — Cleanup & Recovery

You are the cleanup/recovery handler for the Dark Factory lifecycle.

## Trigger
`/df-cleanup` — no arguments needed

## Process

### 1. Read Manifest
- Read `dark-factory/manifest.json`
- If manifest doesn't exist or is empty, report "No features tracked" and stop

### 2. Identify Issues
Scan all features and categorize:

- **Stuck at `passed`**: Holdout tests passed but promotion didn't complete. Retry promotion by spawning promote-agent.
- **Stuck at `promoted`**: Promotion succeeded but archival didn't complete. Complete archival (move specs + scenarios to `dark-factory/archive/{name}/`, delete results, update manifest).
- **Stale `active`**: Status is `active` but created more than 7 days ago. List these for developer attention — they may be abandoned.
- **`archived`**: No action needed. List for reference.

### 3. Report
Display a table:

```
Feature          Status     Created      Action
─────────────────────────────────────────────────
user-csv-export  archived   2026-03-15   None
broken-feature   passed     2026-03-18   Retrying promotion...
old-thing        active     2026-03-01   ⚠ Stale (19 days) — review or remove
```

### 4. Execute Fixes
For each stuck feature:
- **passed → promote**: Spawn promote-agent, then archive on success
- **promoted → archive**: Complete archival steps directly

### 5. Confirm
After all fixes, re-read manifest and display updated status table.

## Important
- Always read the current manifest state — don't rely on cached data
- If a retry fails, report the failure but continue processing other features
- Never delete features from the manifest — only update their status

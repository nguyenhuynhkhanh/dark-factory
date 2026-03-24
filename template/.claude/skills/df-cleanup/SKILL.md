---
name: df-cleanup
description: "Recovery and maintenance for Dark Factory lifecycle. Retries stuck promotions, cleans up completed features, and lists stale features."
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
- **Stuck at `promoted`**: Promotion succeeded but cleanup didn't complete. Run cleanup (commit artifacts to git, delete files, remove from manifest).
- **Stale `active`**: Status is `active` but created more than 7 days ago. List these for developer attention — they may be abandoned.

### 3. Report
Display a table:

```
Feature          Status     Created      Action
─────────────────────────────────────────────────
broken-feature   passed     2026-03-18   Retrying promotion...
old-thing        active     2026-03-01   ⚠ Stale (23 days) — review or remove
done-feature     promoted   2026-03-20   Running cleanup...
```

### 4. Execute Fixes
For each stuck feature:
- **passed → promote**: Spawn promote-agent, then cleanup on success
- **promoted → cleanup**: Commit all feature artifacts to git, delete files, remove from manifest

### 5. Cleanup Steps (for promoted features)
1. Verify all feature artifacts are committed to git (`git status` to check for uncommitted changes)
2. If uncommitted, commit: `"Archive {name}: spec + scenarios (promoted to permanent tests)"`
3. Delete all feature artifacts:
   - `dark-factory/specs/features/{name}.spec.md` (or `bugfixes/{name}.spec.md`)
   - `dark-factory/specs/features/{name}.review.md` (and any domain review files)
   - `dark-factory/scenarios/public/{name}/` directory
   - `dark-factory/scenarios/holdout/{name}/` directory
   - `dark-factory/results/{name}/` directory
4. Remove the feature entry from `dark-factory/manifest.json`
5. Commit the deletion: `"Cleanup {name}: artifacts deleted, tests promoted"`

### 6. Handle Stale Features
For stale `active` features, ask the developer:
- **Keep** — leave it, maybe it's still in progress
- **Remove** — commit artifacts to git, delete files, remove from manifest

### 7. Confirm
After all fixes, re-read manifest and display updated status table.

## Important
- Always read the current manifest state — don't rely on cached data
- If a retry fails, report the failure but continue processing other features
- ALWAYS commit artifacts to git before deleting — git history is the permanent archive
- After cleanup, the manifest should only contain actively in-progress features

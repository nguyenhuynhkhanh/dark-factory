---
name: df-cleanup
description: "Recovery and maintenance for Dark Factory lifecycle. Retries stuck promotions, cleans up completed features, and lists stale features."
---

# Dark Factory — Cleanup & Recovery

You are the cleanup/recovery handler for the Dark Factory lifecycle.

## Trigger
`/df-cleanup` — no arguments needed
Optional: `--rebuild` — reconstruct the promoted test registry from annotation headers in the codebase

## Process

### 1. Read Manifest
- Read `dark-factory/manifest.json`
- If manifest doesn't exist or is empty, report "No features tracked" and stop

### 2. Promoted Test Health Check

Before scanning the manifest for stuck features, verify the health of all promoted tests.

#### 2a. Handle `--rebuild` flag

If `--rebuild` was provided:
1. Scan the codebase for files containing `// Promoted from Dark Factory holdout:` annotation headers.
2. For each match, extract the feature name from the annotation.
3. Detect section markers (`// DF-PROMOTED-START:` / `// DF-PROMOTED-END:`) to determine if the test is co-located.
4. Reconstruct `dark-factory/promoted-tests.json` with entries for each found annotation. Fields that cannot be derived from annotations (like `holdoutScenarioCount`) are set to `null` in rebuilt entries.
5. Show the developer the reconstructed registry before writing. If no annotation headers are found, report: "No promoted test annotations found in codebase. Registry will be empty." and create an empty registry.
6. After rebuild, continue to the health check below with the new registry.

#### 2b. Read the registry

- If `dark-factory/promoted-tests.json` does not exist → report: "No promoted test registry found. No promoted tests to check." Skip to step 3.
- If it exists but is malformed JSON → warn: "promoted-tests.json is malformed. Run `/df-cleanup --rebuild` to reconstruct from annotations." Skip to step 3.
- If `promotedTests` array is empty → report: "No promoted tests found. Run /df-orchestrate to promote tests." Skip to step 3.
- **Version check**: Read the `version` field from the registry. The current supported version is `1`. If the registry `version` is higher than supported, warn: "Registry version {v} is newer than supported ({supported}). Some fields may be ignored." Then continue the health check with best-effort parsing of known fields. Do NOT error out or refuse to check.

#### 2c. Verify each promoted test entry

For each entry in the `promotedTests` array, check ALL of the following in a single pass:

1. **File existence**: Check that each file in the entry's `files` array exists.
   - If missing → report: "MISSING: {path} (promoted from {feature})"

2. **Empty section detection** (co-located tests only): For entries with `sectionMarkers: true`, check whether there is any test content between the `// DF-PROMOTED-START: {feature}` and `// DF-PROMOTED-END: {feature}` markers. If both markers exist but there is no test code between them (only whitespace or blank lines), report: "EMPTY: {path} section for {feature} has no test content". Do NOT report this as MISSING — the file and markers exist, but the section is empty. This is a distinct classification.

3. **Skip detection**: Read each promoted test file and check for `.skip()`, `test.skip(`, `it.skip(`, `describe.skip(`, `xit(`, `xdescribe(`, `xtest(` patterns.
   - For co-located tests with `sectionMarkers: true`, only check within the section markers.
   - For standalone promoted test files, check the entire file.
   - If found → report: "SKIPPED: {path} contains .skip() on promoted tests"

4. **Test execution**: Run the promoted tests using the project's test command.
   - If tests fail → report: "FAILING: {path}" with failure output.
   - Continue checking other promoted tests (do not stop at first failure).

5. **Guard annotation check**: Read `// Guards:` annotations in each promoted test file. For each referenced file path:
   - Strip line numbers (e.g., `src/auth.js:42` → check only `src/auth.js`).
   - Check that the referenced file still exists.
   - If missing → report: "STALE GUARD: {path} references {guard-file} which no longer exists"

Report ALL issues at once, then ask the developer what to do. Do NOT auto-fix — missing tests, skipped tests, and failing tests require human judgment.

### 3. Identify Issues
Scan all features and categorize:

- **Stuck at `passed`**: Holdout tests passed but promotion didn't complete. Retry promotion by spawning promote-agent.
- **Stuck at `promoted`**: Promotion succeeded but cleanup didn't complete. Run cleanup (commit artifacts to git, delete files, remove from manifest).
- **Stale `active`**: Status is `active` but created more than 7 days ago. List these for developer attention — they may be abandoned.

### 4. Report
Display a table:

```
Feature          Status     Created      Action
─────────────────────────────────────────────────
broken-feature   passed     2026-03-18   Retrying promotion...
old-thing        active     2026-03-01   ⚠ Stale (23 days) — review or remove
done-feature     promoted   2026-03-20   Running cleanup...
```

### 5. Execute Fixes
For each stuck feature:
- **passed → promote**: Spawn promote-agent, then cleanup on success
- **promoted → cleanup**: Commit all feature artifacts to git, delete files, remove from manifest

### 6. Cleanup Steps (for promoted features)
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

### 7. Handle Stale Features
For stale `active` features, ask the developer:
- **Keep** — leave it, maybe it's still in progress
- **Remove** — commit artifacts to git, delete files, remove from manifest

### 8. Confirm
After all fixes, re-read manifest and display updated status table.

## Important
- Always read the current manifest state — don't rely on cached data
- If a retry fails, report the failure but continue processing other features
- ALWAYS commit artifacts to git before deleting — git history is the permanent archive
- After cleanup, the manifest should only contain actively in-progress features

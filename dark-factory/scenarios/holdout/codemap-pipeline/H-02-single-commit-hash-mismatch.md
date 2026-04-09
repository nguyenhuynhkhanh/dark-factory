# Scenario: H-02 — Hash Mismatch Detection — Even One Commit Triggers Refresh

## Type
edge-case

## Priority
high — verifies that a single-commit diff (the minimal case) correctly triggers refresh, and that non-source-file commits correctly update the hash without triggering a re-scan

## Preconditions (Case A — source file changed)
- `dark-factory/code-map.md` exists with `> Git hash: hashX`
- Exactly ONE new commit was made since `hashX`
- That commit changed exactly ONE source file: `.claude/agents/debug-agent.md`
- Current HEAD is `hashY`
- The developer runs `/df-debug investigate some bug`

## Action (Case A)
Pre-phase runs:
1. Read stored hash: `hashX`
2. `git rev-parse HEAD`: `hashY`
3. `hashX != hashY` → run `git diff --name-only hashX hashY`
4. Returns: `.claude/agents/debug-agent.md`
5. Fan-in set from map for debug-agent.md (checked in map's Module Dependency Graph)
6. Re-scan set built, codemap-agent invoked
7. Map updated, hash written as `hashY`

## Expected Outcome (Case A)
- Refresh IS triggered for a single-commit diff
- Only the changed file + its fan-in set are re-scanned
- Map hash is updated to `hashY`
- Investigators proceed with fresh map

---

## Preconditions (Case B — only non-source file changed)
- Same map with `> Git hash: hashX`
- ONE new commit changed only `README.md` (not a source file — not in any module in the map)
- Current HEAD is `hashZ`
- The developer runs `/df-debug investigate some bug`

## Action (Case B)
Pre-phase runs:
1. Read stored hash: `hashX`
2. `git rev-parse HEAD`: `hashZ`
3. `hashX != hashZ` → run `git diff --name-only hashX hashZ`
4. Returns: `README.md`
5. Look up `README.md` in map: not found in any module entry
6. Re-scan set is empty (no module entries to update, no fan-in)
7. Update hash in map header to `hashZ` only (no codemap-agent scan needed)
8. Proceed to pipeline

## Expected Outcome (Case B)
- The stored hash IS updated from `hashX` to `hashZ`
- NO codemap-agent scanner is invoked (empty re-scan set)
- The map body (all module entries) is unchanged
- Pipeline proceeds immediately after hash update
- This correctly avoids unnecessary re-scan for documentation-only commits

## Failure Mode (if applicable)
If the implementation triggers a full re-scan any time the hash differs (not checking whether any changed files are in the map), Case B would unnecessarily re-scan the entire codebase for every documentation commit. This is the expected failure mode of a naive implementation.

## Notes
This is a holdout scenario because the optimization in Case B (no re-scan when diff is non-source-only) is easy to skip — a correct but inefficient implementation would still pass the public scenarios. This scenario validates that the skip is implemented.

EC-2 coverage.

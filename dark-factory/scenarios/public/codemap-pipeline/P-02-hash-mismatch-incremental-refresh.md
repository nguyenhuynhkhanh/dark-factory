# Scenario: P-02 — Hash Mismatch — Incremental Refresh Triggered

## Type
feature

## Priority
critical — this is the core value-add of the feature: keeping the map current across commits without a full rebuild

## Preconditions
- `dark-factory/code-map.md` exists with:
  - `> Git hash: oldHash111111111111111111111111111111111111`
  - `> Coverage: FULL`
  - Module Dependency Graph section listing modules including `scripts/init-dark-factory.js`
- Current HEAD is `newHash222222222222222222222222222222222222` (different from stored hash)
- `git diff --name-only oldHash111111111111111111111111111111111111 newHash222222222222222222222222222222222222` returns:
  ```
  scripts/init-dark-factory.js
  ```
- The map's Module Dependency Graph shows that `tests/dark-factory-setup.test.js` imports from `scripts/init-dark-factory.js`
- The developer runs `/df-intake some feature description`

## Action
The df-intake skill executes its Step 0 pre-phase:
1. Read stored hash from map header: `oldHash111111111111111111111111111111111111`
2. Run `git rev-parse HEAD`: returns `newHash222222222222222222222222222222222222`
3. Hashes differ → run `git diff --name-only oldHash... newHash...`
4. Changed file set: `[scripts/init-dark-factory.js]`
5. Look up fan-in set in existing map: `tests/dark-factory-setup.test.js` imports `scripts/init-dark-factory.js`
6. Invoke codemap-agent in refresh mode with: changed files = `[scripts/init-dark-factory.js]`, fan-in set = `[tests/dark-factory-setup.test.js]`
7. codemap-agent re-scans those 2 files, merges updated entries into the existing map
8. Map header updated: `> Git hash: newHash222222222222222222222222222222222222`
9. Proceed to Step 1 (spawn spec leads)

## Expected Outcome
- codemap-agent IS spawned exactly once, in incremental refresh mode
- Only `scripts/init-dark-factory.js` and `tests/dark-factory-setup.test.js` are re-scanned (not the whole codebase)
- The map's Module Dependency Graph entries for those two files are updated
- All other map entries (for files not in the changed set or fan-in set) are preserved unchanged
- The `Git hash:` header line is updated to `newHash222222222222222222222222222222222222`
- `Coverage:` remains `FULL` (no scanner failure, fan-in set within cap)
- No developer sign-off prompt is shown
- Spec leads proceed with the refreshed map

## Failure Mode (if applicable)
If the incremental merge incorrectly replaces the entire map instead of merging, unchanged modules lose their entries. The map after refresh must contain all modules that existed before, with only the re-scanned modules' entries updated.

## Notes
EC-1 coverage: if the existing map has no `Git hash:` line (pre-feature map), the pre-phase must treat this as a missing/mismatched hash and trigger a full re-scan. The code-agent should handle the "no hash line found" case as equivalent to hash-mismatch.

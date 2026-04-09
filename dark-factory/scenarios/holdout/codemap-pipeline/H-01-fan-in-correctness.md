# Scenario: H-01 — Fan-In Correctness — Changed File's Importers Are Re-Scanned

## Type
edge-case

## Priority
critical — if fan-in computation is wrong, modules that import a changed file will have stale entries in the map, causing agents to use incorrect dependency information

## Preconditions
- `dark-factory/code-map.md` exists with:
  - `> Git hash: hashA`
  - Module Dependency Graph:
    ```
    tests/dark-factory-setup.test.js -> [scripts/init-dark-factory.js]
    .claude/agents/spec-agent.md -> []
    scripts/init-dark-factory.js -> []
    ```
  - No other modules import `scripts/init-dark-factory.js` in the map
- Current HEAD is `hashB` (one commit ahead of `hashA`)
- `git diff --name-only hashA hashB` returns: `scripts/init-dark-factory.js`
- The actual change: a new helper function was added to `scripts/init-dark-factory.js`, which `tests/dark-factory-setup.test.js` will now also call
- `tests/dark-factory-setup.test.js` was NOT changed (no git diff entry for it)

## Action
The pre-pipeline pre-phase runs:
1. Detects hash mismatch (hashA vs hashB)
2. Runs `git diff --name-only hashA hashB` → `[scripts/init-dark-factory.js]`
3. Looks up fan-in set from map: who imports `scripts/init-dark-factory.js`? → `[tests/dark-factory-setup.test.js]`
4. Builds re-scan set: `[scripts/init-dark-factory.js, tests/dark-factory-setup.test.js]`
5. Codemap-agent re-scans both files
6. Map updated: entries for both files reflect their current state
7. Hash updated to `hashB`

## Expected Outcome
- `tests/dark-factory-setup.test.js` IS included in the re-scan, even though it was not in `git diff`
- `tests/dark-factory-setup.test.js` is in the re-scan because it IMPORTS `scripts/init-dark-factory.js` (fan-in lookup)
- `.claude/agents/spec-agent.md` is NOT included in the re-scan (it does not import the changed file)
- The map after refresh has updated entries for both `scripts/init-dark-factory.js` AND `tests/dark-factory-setup.test.js`
- All other module entries remain unchanged
- Hash in header is now `hashB`

## Variant: Changed file has NO importers (leaf node)
- `git diff` returns a file with no fan-in (fan-in set = empty)
- Re-scan set = `[changed-file]` only
- Map updated for that file only
- No error or warning about empty fan-in set

## Variant: Changed file is a Dark Factory instruction file
- `git diff` returns `.claude/agents/spec-agent.md`
- Fan-in lookup: which modules import spec-agent? (Based on map — likely none in this project)
- Re-scan set = `[.claude/agents/spec-agent.md]`
- Map entry for spec-agent is updated
- Dark Factory files are included in the map by design; same re-scan logic applies

## Variant: Deleted file
- `git diff` returns a file that no longer exists on disk
- Re-scan: file is not found on disk
- Map removes the entry for that file (does not leave a stale entry)
- Fan-in modules of the deleted file are re-scanned (they may now have a broken import)
- Hash updated

## Failure Mode (if applicable)
If fan-in lookup uses a fresh Grep on the codebase instead of the existing map's Module Dependency Graph, it will be correct but defeats the purpose of incremental refresh (and slows the pre-phase). The lookup MUST use the existing map.

## Notes
This is a holdout scenario because the fan-in lookup correctness is a subtle implementation detail — an implementation that simply re-scans only the git-diff files (ignoring fan-in) would pass the public scenarios but fail this one.

# Scenario: H-03 — Partial Scanner Failure — Map Written With Coverage Flag; Pipeline Proceeds

## Type
failure-recovery

## Priority
high — scanner failures must not block the pipeline; a partially-stale map is better than a fully-blocked pipeline

## Preconditions
- `dark-factory/code-map.md` exists with `> Git hash: hashOld`
- `git diff --name-only hashOld HEAD` returns 3 changed files:
  - `.claude/agents/spec-agent.md`
  - `.claude/agents/code-agent.md`
  - `scripts/init-dark-factory.js`
- Fan-in set for `scripts/init-dark-factory.js` includes 5 modules
- Total re-scan set: 8 modules
- The codemap-agent spawns scanner sub-agents; the scanner for `scripts/init-dark-factory.js` and its fan-in fails (timeout or agent error)
- The scanners for `.claude/agents/spec-agent.md` and `.claude/agents/code-agent.md` succeed

## Action
Pre-phase invokes codemap-agent in incremental refresh mode:
1. Codemap-agent spawns scanner agents for all 8 modules in the re-scan set
2. 2 scanners succeed: spec-agent.md and code-agent.md entries are updated
3. Scanner for init-dark-factory.js and its fan-in modules fail
4. Codemap-agent merges successful scanner results into the existing map
5. Codemap-agent updates the map header:
   - `> Git hash: {current HEAD hash}` (hash IS updated — the partial results are for the current commit)
   - `> Coverage: PARTIAL — scanner failure during refresh: scripts/init-dark-factory.js and 5 fan-in modules not updated`
6. Map is written to disk
7. Pre-phase returns — no abort, no developer prompt
8. Pipeline proceeds (df-intake continues to spawn leads)

## Expected Outcome
- `dark-factory/code-map.md` EXISTS after this sequence (not deleted or corrupted)
- Map entries for `spec-agent.md` and `code-agent.md` are updated (successful scanners)
- Map entries for `scripts/init-dark-factory.js` and its fan-in modules are stale (from before the commit) but present
- The `Git hash:` line shows the CURRENT HEAD hash (not the old hash)
- The `Coverage:` line reads `PARTIAL` with a description of what was not updated
- Pipeline agents that subsequently read the map can see the coverage warning in the header
- NO developer interaction is required — the pipeline runs to completion (agents use the partial map with caveat)

## Failure Mode (if applicable)
The inverse failure: if the implementation aborts the pipeline when any scanner fails, developers are blocked every time a scanner times out. The partial-result approach is the correct design.

## Notes
This is a holdout scenario because a naive implementation might either: (a) abort on any scanner failure, or (b) succeed but not write the PARTIAL flag. Both are wrong — agents downstream need the coverage caveat to know which sections of the map may be stale.

The hash IS updated even on partial failure. This is intentional: the next invocation should not retry the same failed scan (which would likely fail again for the same reason). The PARTIAL flag communicates the staleness; the updated hash prevents infinite retry loops.

EC-3 coverage (fan-in cap variant): if the fan-in set for a hotspot exceeds 20 modules, the map header should read `COVERAGE: PARTIAL — fan-in set truncated at 20 modules` and only the first 20 fan-in modules are re-scanned. The cap truncation must also be tested: given a module with 25 importers, exactly 20 are re-scanned and 5 are silently omitted (with the flag set).

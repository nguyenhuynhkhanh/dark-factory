# Scenario: codemap incremental refresh updates code-map-slim.md in the same pass

## Type
edge-case

## Priority
high — incremental refresh is the most common codemap-agent invocation (triggered by df-intake/df-debug/df-orchestrate on every pipeline run). If it skips updating the slim file, the slim map quickly becomes stale while the full map stays fresh.

## Preconditions
- `codemap-agent.md` has been updated to include the slim-map generation step.
- The incremental refresh mode path in codemap-agent is distinct from the full-scan path.

## Action
Read `.claude/agents/codemap-agent.md`. Locate the Incremental Refresh Mode section. Check whether `code-map-slim.md` is mentioned in the refresh path.

## Expected Outcome
- The Incremental Refresh Mode section (or equivalent) in `codemap-agent.md` contains a reference to `code-map-slim.md`.
- The instruction states that `code-map-slim.md` is updated/regenerated in the same pass as `code-map.md` during incremental refresh.
- The refresh path does NOT have a condition that skips the slim file update (e.g., there is no "if slim file exists, skip" logic).
- The updated `code-map-slim.md` carries the same git hash as the freshly written `code-map.md` (same hash rule from FR-8 applies in refresh mode too).

## Failure Mode
If the slim file is NOT updated during incremental refresh: after a codemap refresh triggered by a pipeline, the slim file has an older git hash than the full file. Any consumer using the slim file for freshness checking would see a false-stale state.

## Notes
Validates FR-11, BR-2, EC-1. This is holdout because an implementer might correctly add slim generation to the full-scan path but miss the incremental refresh path — both exist in codemap-agent.md as distinct code paths.

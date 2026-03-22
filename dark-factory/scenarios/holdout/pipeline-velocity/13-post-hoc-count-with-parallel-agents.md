# Scenario: Post-hoc file count correctly handles multiple parallel code-agents

## Type
edge-case

## Priority
medium -- validates accurate measurement across parallel tracks

## Preconditions
- A large-scope feature was implemented with 3 parallel code-agents
- Track 1 modified files: `a.md`, `b.md`, `c.md`
- Track 2 modified files: `d.md`, `e.md`
- Track 3 modified files: `f.md`, `g.md`, `h.md`
- No file overlaps between tracks (as required by the parallel rules)

## Action
After implementation, the orchestrator performs the post-hoc file count check.

## Expected Outcome
- The orchestrator counts all distinct files modified across ALL tracks
- `actualFiles` in the manifest is set to 8 (the union of all tracks)
- Files are not double-counted even if the orchestrator reads reports from multiple agents

## Failure Mode (if applicable)
If the orchestrator only counts files from the last code-agent that reported, the actual count would be 3 instead of 8. If it concatenates reports without deduplication, overlapping utility files (if any exist despite the no-overlap rule) could be double-counted.

## Notes
The orchestrator should collect file lists from all code-agent reports and compute the distinct count.

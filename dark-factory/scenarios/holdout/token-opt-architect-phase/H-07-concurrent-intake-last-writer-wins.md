# Scenario: Concurrent df-intake Runs for Same Spec — Last Writer Wins

## Type
concurrency

## Priority
low — concurrent intake is an edge case in a single-developer workflow; documented behavior is "last writer wins"

## Preconditions
- Two df-intake processes are running simultaneously for `contested-spec`
- Run A: started first, architect review in progress
- Run B: started second, architect review in progress independently

## Action
Both runs complete architect review and attempt to:
1. Write `contested-spec.findings.md`
2. Write manifest entry for `contested-spec`

Run A finishes first and writes its manifest entry with `architectReviewedCodeHash: "sha-run-a"`.
Run B finishes second and overwrites the manifest entry with `architectReviewedCodeHash: "sha-run-b"`.

## Expected Outcome

### Last writer wins on manifest
- Final manifest entry for `contested-spec` reflects Run B's values (`architectReviewedAt` from B, `architectReviewedCodeHash: "sha-run-b"`)
- Run A's manifest data is silently overwritten (no error, no merge)

### Last writer wins on findings.md
- `contested-spec.findings.md` reflects Run B's content (B wrote last)
- Run A's findings content is gone

### No corruption
- manifest.json remains valid JSON after both writes
- findings.md is a complete valid markdown file (not partially written)

### Both manifest entries have the same key
- There is only ONE `contested-spec` entry in the manifest (not two)

### Developer outcome
- If the developer subsequently runs df-orchestrate, it reads the manifest from Run B
- The implementation proceeds with Run B's findings and SHA — consistent state

## Notes
This scenario maps to EC-7.
The "last writer wins" outcome is explicitly acknowledged in the spec as acceptable for a single-developer workflow. This is not a regression — it is the documented expected behavior. The scenario validates that concurrent writes do not produce corrupt JSON or partial writes, not that the "right" run wins.

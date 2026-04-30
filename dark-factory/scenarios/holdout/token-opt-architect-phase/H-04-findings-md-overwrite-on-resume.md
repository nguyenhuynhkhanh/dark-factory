# Scenario: findings.md Overwritten on Resume — Existing findings.md from Previous Run Replaced

## Type
edge-case

## Priority
medium — stale findings.md from a previous partial run must not persist into the new review

## Preconditions
- `dark-factory/specs/features/resume-spec.spec.md` exists (written in previous intake run)
- `dark-factory/specs/features/resume-spec.findings.md` EXISTS on disk — it was written by a previous APPROVED verdict that was interrupted before Step 6 manifest write
- `dark-factory/manifest.json` does NOT have an entry for `resume-spec` (the previous run was interrupted after findings.md write but before Step 6)
- Developer runs: `/df-intake resume-spec` — triggers resume mode (Step 5.6 only)

## Action
df-intake Step 5.6 runs architect review on the existing spec. The architect reviews and returns APPROVED.

## Expected Outcome

### Existing findings.md overwritten
- The OLD `resume-spec.findings.md` content is replaced with new review content
- df-intake does NOT skip findings.md write because the file already exists
- The new findings.md reflects the current architect review, not the previous one

### No stale findings preserved
- After Step 5.6 completes, `resume-spec.findings.md` contains ONLY the new review content
- No backup of old findings is created

### Manifest written normally
- Step 6 writes manifest entry with `architectReviewedAt` set to the timestamp of this review
- `architectReviewedCodeHash` captures current HEAD (the current codebase state, which may differ from when the previous run happened)

## Failure Mode
If the findings.md write fails during overwrite (disk error, permissions): df-intake stops with a write error, does NOT proceed to Step 6. The old findings.md may be partially written or intact depending on when the failure occurred.

## Notes
This scenario maps to EC-4.
The key behavior: findings.md is ALWAYS written (or overwritten) in Step 5.6 on APPROVED verdict. The file is not treated as a cache. This ensures the manifest's `findingsPath` always points to content that matches the most recent architect review.

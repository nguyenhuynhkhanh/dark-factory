# Scenario: Staleness Detection — architectReviewedCodeHash Differs from HEAD

## Type
feature

## Priority
high — staleness detection prevents implementation-agent from working from a review that's no longer current

## Preconditions
- `dark-factory/manifest.json` entry for `stale-spec` has:
  - `architectReviewedAt`: a past timestamp
  - `findingsPath`: `"dark-factory/specs/features/stale-spec.findings.md"`
  - `architectReviewedCodeHash`: `"aaaa111122223333444455556666777788889999"` (an older SHA)
- Current HEAD is `"bbbb111122223333444455556666777788889999"` (different SHA — new commits since review)
- `dark-factory/specs/features/stale-spec.spec.md` exists
- `dark-factory/specs/features/stale-spec.findings.md` exists with old findings content
- df-orchestrate is about to spawn implementation-agent for `stale-spec`

## Action
df-orchestrate reads `architectReviewedCodeHash` from the manifest entry for `stale-spec`. It compares to `git rev-parse HEAD`. The SHAs differ.

## Expected Outcome

### Developer warning emitted
- df-orchestrate emits a visible warning before starting the re-review:
  > "Code has changed since spec `stale-spec` was reviewed (stored: aaaa1111..., current: bbbb1111...). Re-running architect review before implementation."
- The warning appears in df-orchestrate's output, not silently

### Re-run architect review
- df-orchestrate spawns a fresh architect-agent with the pre-written spec (same tier-aware logic as Step 5.6)
- The architect-agent reviews the current spec against the current codebase

### On APPROVED: findings.md overwritten, manifest updated
- `dark-factory/specs/features/stale-spec.findings.md` is overwritten with new review content
- Manifest entry updated with:
  - `architectReviewedAt`: new ISO timestamp
  - `architectReviewedCodeHash`: current HEAD SHA (`bbbb1111...`)
  - `findingsPath`: unchanged (same path)

### implementation-agent spawned after re-review
- Only after APPROVED (or APPROVED WITH NOTES) does df-orchestrate spawn implementation-agent
- implementation-agent reads fresh `findingsPath` content

### What does NOT happen
- implementation-agent does NOT spawn without a fresh review when hash differs
- The old findings.md is NOT preserved alongside the new one (it is overwritten)

## Failure Mode
If the staleness re-run produces BLOCKED (after max rounds): df-orchestrate does NOT spawn implementation-agent for this spec. It reports the blocker to the developer. Other specs in the batch proceed normally.

## Notes
This scenario maps to AC-10, FR-9, BR-5, BR-8.
The staleness check is per-spec, not per-batch: each spec in a df-orchestrate run is independently checked before its implementation-agent is spawned.

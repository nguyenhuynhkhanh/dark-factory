# Scenario: git rev-parse HEAD Fails During Step 5.6 SHA Capture

## Type
failure-recovery

## Priority
medium — git errors should degrade gracefully, not crash df-intake

## Preconditions
- df-intake has completed Steps 1–5.5 for spec `headless-spec`
- `git rev-parse HEAD` fails (simulated: bare repo with no commits, detached HEAD with no commits, or git binary not in PATH)
- Architect review in Step 5.6 has returned APPROVED

## Action
df-intake Step 5.6 attempts to capture `git rev-parse HEAD` for `architectReviewedCodeHash`. The git command fails.

## Expected Outcome

### Graceful degradation — null SHA
- df-intake logs the git error: "Unable to capture architectReviewedCodeHash: git error"
- `architectReviewedCodeHash` is set to `null` in the manifest entry (not an error string, not absent)
- findings.md is still written normally

### Manifest entry written with null hash
- Manifest entry for `headless-spec` is written with `architectReviewedAt` and `findingsPath` populated normally
- `architectReviewedCodeHash` is `null`

### df-orchestrate staleness behavior with null hash
- When df-orchestrate reads `architectReviewedCodeHash: null` and current HEAD is a valid SHA:
  - null hash is treated as "unknown — re-run architect review"
  - df-orchestrate triggers a fresh architect review before spawning implementation-agent
  - This is the conservative/safe behavior: unknown staleness → assume stale

### What does NOT happen
- df-intake does NOT abort the entire intake because git failed
- findings.md write is NOT blocked by the git failure
- Manifest entry is NOT skipped

## Notes
This scenario maps to EC-3.
The `null` value for `architectReviewedCodeHash` is distinct from a missing key. An implementation that checks `if (!hash)` would correctly treat both null and absent as "re-run required." An implementation that only checks key existence would miss the null case. This is a companion scenario to H-01 (which tests null for `architectReviewedAt`).

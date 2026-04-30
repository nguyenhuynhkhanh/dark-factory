# Scenario: Staleness Re-Run — New Architect Review Produces Different Notes; Manifest and findings.md Fully Updated

## Type
edge-case

## Priority
high — staleness re-run must update ALL three manifest fields, not just the hash

## Preconditions
- Manifest entry for `evolved-spec` has:
  - `architectReviewedAt`: `"2026-04-01T10:00:00Z"` (old timestamp)
  - `findingsPath`: `"dark-factory/specs/features/evolved-spec.findings.md"`
  - `architectReviewedCodeHash`: `"oldsha0000111122223333444455556666777788889"`
- `evolved-spec.findings.md` exists with OLD content: "Use the retry wrapper from PaymentService."
- Current HEAD is `"newsha9999888877776666555544443333222211110"` (hash differs)
- New codebase has deprecated `PaymentService` — it no longer exists
- df-orchestrate detects hash mismatch, runs staleness re-review

## Action
Staleness re-review runs. Architect reviews the spec against the current codebase (no PaymentService). Returns APPROVED WITH NOTES: "PaymentService was removed in recent commits. Use the new TransactionService.retryPolicy() instead."

## Expected Outcome

### findings.md overwritten with new content
- `evolved-spec.findings.md` now contains: "PaymentService was removed... Use TransactionService.retryPolicy() instead."
- Old content ("Use the retry wrapper from PaymentService") is GONE
- File content reflects the current-codebase review

### All three manifest fields updated
- `architectReviewedAt`: updated to the timestamp of the new review (NOT the old timestamp)
- `findingsPath`: unchanged (same path)
- `architectReviewedCodeHash`: updated to current HEAD (`"newsha9999..."`)

### Exact SHA equality enforced
- The old SHA (`"oldsha0000..."`) differed from current HEAD by a single character in this scenario — this still triggers the re-run (no partial-match logic)

### implementation-agent spawned with fresh findings
- After staleness re-review APPROVED, df-orchestrate spawns implementation-agent normally
- implementation-agent reads the UPDATED manifest (new `architectReviewedAt`, new `architectReviewedCodeHash`)
- code-agent reads the UPDATED `findings.md` (references TransactionService, not PaymentService)

### What does NOT happen
- Old findings.md is NOT preserved (no `findings.md.bak` or similar)
- implementation-agent is NOT spawned before staleness re-review completes

## Notes
This scenario maps to FR-9, BR-5, BR-8, EC-6.
The key assertion: all three fields must be updated atomically in the same Step 6 update after the staleness re-review. An implementation that updates only `architectReviewedCodeHash` but leaves old `architectReviewedAt` would fail this scenario.

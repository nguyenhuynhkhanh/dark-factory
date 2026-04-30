# Scenario: Resume Detection — Spec Exists AND Manifest Entry Already Has architectReviewedAt

## Type
edge-case

## Priority
medium — developer re-runs df-intake after a successful intake; should not re-run Gate 1 unnecessarily

## Preconditions
- `dark-factory/specs/features/already-approved.spec.md` exists on disk
- `dark-factory/manifest.json` ALREADY has a complete entry for `already-approved` INCLUDING `architectReviewedAt` (non-null)
- `dark-factory/specs/features/already-approved.findings.md` exists on disk
- Developer runs: `/df-intake already-approved` (perhaps to check status or by mistake)

## Action
df-intake Step 0 detects:
1. Spec file exists → resume mode triggered
2. Reads manifest — `architectReviewedAt` is already set

## Expected Outcome

### df-intake does NOT re-run Step 5.6
- Gate 1 architect review is NOT re-run
- findings.md is NOT overwritten
- `architectReviewedAt` is NOT updated in the manifest

### Developer offered direct orchestration
- df-intake informs the developer: "Spec `already-approved` has already completed architect review. Proceed to implementation with `/df-orchestrate already-approved` or re-investigate the spec by running `/df-intake already-approved --force`."
- (The `--force` flag is outside scope of this feature but the message documents the escape hatch)

### What does NOT happen
- No architect-agent is spawned
- No spec-agent is re-spawned
- Manifest entry is not modified

## Failure Mode
If the developer expects to re-run Gate 1 (e.g., spec was significantly revised manually), they should use the staleness detection path: make a commit to the repo and let df-orchestrate trigger the staleness re-review. Or wait for the `--force` flag to be implemented.

## Notes
This scenario maps to EC-1.
This is a subtle idempotency case: the normal resume path (P-05) assumes no `architectReviewedAt` in manifest; this scenario has one. The two paths must be distinguished.

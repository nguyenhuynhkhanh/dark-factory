# Scenario: Legacy Manifest Entries — playwright-lifecycle and project-memory-onboard — Must Be Migrated Before Orchestration

## Type
regression

## Priority
critical — without migration, df-orchestrate on either active spec will hard-fail immediately after this feature ships

## Preconditions
- This feature has just shipped (df-intake SKILL.md and implementation-agent updated)
- `dark-factory/manifest.json` still contains entries for `playwright-lifecycle` and `project-memory-onboard` that predate this feature (no `architectReviewedAt` field)
- Developer runs: `/df-orchestrate playwright-lifecycle`

## Action
df-orchestrate reads manifest entry for `playwright-lifecycle`. Checks `architectReviewedCodeHash` (absent) — staleness detection attempts to compare to HEAD, but the field is missing entirely.

df-orchestrate spawns implementation-agent for `playwright-lifecycle`.

implementation-agent reads manifest entry. Checks `architectReviewedAt` — field is absent.

## Expected Outcome

### Hard-fail with migration guidance
- implementation-agent hard-fails with exact message:
  > "Spec playwright-lifecycle has no architect review record. This spec was likely created before token-opt-architect-phase shipped. Re-run /df-intake playwright-lifecycle to complete architect review, then retry."

### Structured result
- `{ "specName": "playwright-lifecycle", "status": "blocked", "error": "..." }`

### Developer action is clear
- Message tells developer exactly what to do: `/df-intake playwright-lifecycle`
- df-intake resumes (spec file exists) → runs Step 5.6 → writes findings.md + manifest fields
- THEN `/df-orchestrate playwright-lifecycle` succeeds

### Migration note is documented
- The migration note in the spec (FR-11, Migration & Deployment section) documents:
  - Which entries are affected (`playwright-lifecycle`, `project-memory-onboard`)
  - What the developer must do before orchestrating each
  - That the hard-fail message is the migration guide

### Second spec (project-memory-onboard) same behavior
- Running `/df-orchestrate project-memory-onboard` before migration also hard-fails with the same pattern

## Notes
This scenario maps to FR-11, D7, AC-15.
This scenario tests the migration contract end-to-end: the error message is the migration guide, and following it (re-running df-intake) resolves the issue cleanly. The two active specs in manifest.json at ship time are the concrete migration targets.

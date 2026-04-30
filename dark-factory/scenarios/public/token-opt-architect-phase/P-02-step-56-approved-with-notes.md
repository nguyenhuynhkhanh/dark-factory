# Scenario: Step 5.6 APPROVED WITH NOTES — Notes in findings.md, Proceeds to Step 6

## Type
feature

## Priority
high — APPROVED WITH NOTES is a common architect outcome; must proceed like APPROVED

## Preconditions
- df-intake has completed Steps 1–5.5 for spec `my-feature`
- `dark-factory/specs/features/my-feature.spec.md` exists
- No manifest entry for `my-feature`
- No findings.md for `my-feature`

## Action
df-intake runs Step 5.6 architect review. The architect-agent (one of the domain agents for a Tier 2 spec) returns verdict **APPROVED WITH NOTES** — e.g., "spec is approved but code-agent should prefer the existing retry wrapper over rolling a new one."

The synthesized verdict is: **APPROVED WITH NOTES** (no domain returned BLOCKED).

## Expected Outcome

### findings.md written with notes included
- `dark-factory/specs/features/my-feature.findings.md` is created
- The file contains the notes from the architect (not stripped, not summarized away)
- File is written before Step 6 manifest write

### Proceeds to Step 6 normally
- `dark-factory/manifest.json` entry for `my-feature` is written with all three new fields: `architectReviewedAt`, `findingsPath`, `architectReviewedCodeHash`
- Status is `"active"`
- df-intake does NOT treat APPROVED WITH NOTES as BLOCKED
- No spec-agent revision is triggered

### Notes channel preserved
- The architect's notes are available to code-agent via `architectFindingsPath` (which reads findings.md)
- code-agent will read the notes at startup and factor them into implementation

### What does NOT happen
- Step 5.6 does NOT enter the BLOCKED revision loop
- Spec-agent is NOT re-spawned
- No developer prompt asking "should we proceed?"

## Notes
This scenario maps to AC-3, FR-2, BR-7, EC-2.
APPROVED WITH NOTES intentionally passes silently through to manifest write — the notes channel (findings.md → code-agent) is the designed communication path. A split recommendation in the notes (EC-2) also lands here: spec-agent does NOT auto-split based on notes; that is a developer decision.

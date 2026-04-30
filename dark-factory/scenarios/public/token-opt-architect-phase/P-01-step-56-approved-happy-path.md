# Scenario: Step 5.6 Happy Path — Architect APPROVED on First Pass

## Type
feature

## Priority
critical — this is the primary path every new spec will traverse; if this fails nothing ships

## Preconditions
- df-intake has completed Steps 1–5.5 successfully for spec `my-feature`
- `dark-factory/specs/features/my-feature.spec.md` exists with `Architect Review Tier: Tier 2`
- Scenarios have been written to `dark-factory/scenarios/public/my-feature/` and `dark-factory/scenarios/holdout/my-feature/`
- Test-advisor handoff (Step 5.5) has completed (or timed out non-blocking)
- `dark-factory/manifest.json` does NOT yet have an entry for `my-feature`
- `dark-factory/specs/features/my-feature.findings.md` does NOT yet exist

## Action
df-intake proceeds to Step 5.6 and runs the tier-aware architect review for `my-feature`.

Architect review (3 domain agents for Tier 2) returns overall verdict: **APPROVED**.

## Expected Outcome

### Step 5.6 findings.md write
- `dark-factory/specs/features/my-feature.findings.md` is written BEFORE the manifest entry
- The file contains the "Key Decisions Made" and "Remaining Notes" sections extracted from the architect review

### Step 6 manifest write
- `dark-factory/manifest.json` entry for `my-feature` contains all standard fields PLUS:
  - `"architectReviewedAt"`: valid ISO 8601 timestamp (non-empty string)
  - `"findingsPath"`: `"dark-factory/specs/features/my-feature.findings.md"`
  - `"architectReviewedCodeHash"`: 40-character lowercase hex string (output of `git rev-parse HEAD`)
- Entry status is `"active"`

### Ordering invariant
- The timestamp in `architectReviewedAt` is set AFTER findings.md is written (findings.md exists when manifest is written)

### What does NOT happen
- No architect-agent is spawned inside implementation-agent
- df-orchestrate is not yet involved (Step 5.6 is an intake step)

## Notes
This scenario maps to AC-1, AC-2, AC-7, FR-1, FR-2, FR-6, BR-2.
The findings.md-before-manifest ordering is the contract that prevents implementation-agent from receiving a `findingsPath` pointing to a non-existent file.

# Scenario: Resume Detection — /df-intake on Existing Spec File Skips to Step 5.6

## Type
feature

## Priority
high — resume is the developer's recovery path when Gate 1 was previously exhausted or interrupted

## Preconditions
- `dark-factory/specs/features/my-feature.spec.md` exists on disk (written in a previous intake run)
- `dark-factory/scenarios/public/my-feature/` directory exists with scenario files
- `dark-factory/scenarios/holdout/my-feature/` directory exists with scenario files
- `dark-factory/manifest.json` does NOT have an entry for `my-feature` (previous run exhausted Gate 1 or was interrupted before Step 6)
- Developer runs: `/df-intake my-feature`

## Action
df-intake Step 0 runs scope evaluation. During context loading, it detects that `dark-factory/specs/features/my-feature.spec.md` already exists.

## Expected Outcome

### Steps 1–5 skipped
- df-intake does NOT spawn any spec-agent leads (Steps 1–2 skipped)
- df-intake does NOT present findings for developer review (Step 3 skipped)
- df-intake does NOT run decomposition analysis (Step 4 skipped)
- df-intake does NOT re-write the spec or scenarios (Step 5 skipped)
- df-intake does NOT re-run test-advisor handoff (Step 5.5 skipped)

### Proceeds directly to Step 5.6
- df-intake reads the existing `my-feature.spec.md`
- df-intake runs Gate 1 architect review on the existing spec
- If APPROVED: writes findings.md, writes manifest entry (Step 6)
- If BLOCKED: follows the BLOCKED revision loop

### Developer-facing output before Step 5.6 runs
- df-intake informs the developer: "Found existing spec for `my-feature`. Resuming from architect review (Step 5.6)."
- Does NOT ask the developer to re-confirm scope

## Failure Mode
If the spec file does not exist AND no `--leads` override was supplied, df-intake runs the full investigation (Steps 1–7) as normal. No resumption logic applies.

## Notes
This scenario maps to AC-6, FR-5.
The resume detection is file-existence based: `dark-factory/specs/features/{name}.spec.md` present → skip to Step 5.6. No flag required. This is the described behavior from D2 in the confirmed decisions.

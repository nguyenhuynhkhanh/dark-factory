# Scenario: df-cleanup gracefully skips slim refresh when full files do not exist

## Type
edge-case

## Priority
high — df-cleanup can run on a fresh clone or before any onboard has happened. Attempting to read non-existent full files and regenerate from them must not crash cleanup.

## Preconditions
- `df-cleanup/SKILL.md` has been updated with the slim-file refresh step.
- Simulate a state where neither `dark-factory/project-profile.md` nor `dark-factory/code-map.md` exists (fresh clone, no onboard run yet).

## Action
Read `.claude/skills/df-cleanup/SKILL.md`. Verify the slim refresh step has explicit handling for missing full files.

## Expected Outcome
- The slim refresh step contains a conditional: "if `project-profile.md` exists, regenerate slim profile; otherwise, skip and log."
- The slim refresh step contains a parallel conditional: "if `code-map.md` exists, regenerate slim map; otherwise, skip and log."
- The skip is graceful — it does NOT cause df-cleanup to abort or throw an error.
- df-cleanup continues to Step 2 (health check) and Step 3 (manifest scan) regardless of whether slim files were regenerated.

## Failure Mode
If the slim refresh step crashes when full files are missing: df-cleanup becomes unusable on fresh clones or pre-onboard projects. This would break the recovery scenario where a developer runs df-cleanup to fix a stuck feature on a project that was never fully onboarded.

## Notes
Validates FR-13, EC-2. Holdout because an implementer might write the refresh step as an unconditional "read full file and extract" — which would error with a "file not found" when the full file is absent.

# Scenario: df-cleanup refreshes slim files before the promoted-test health check

## Type
edge-case

## Priority
high — ordering matters. If the slim refresh happens after the health check, any agent spawned by cleanup sees a stale slim file during the cleanup run itself.

## Preconditions
- `df-cleanup/SKILL.md` has been updated with the slim-file refresh step.
- Both `dark-factory/project-profile.md` and `dark-factory/code-map.md` exist on disk (simulating a project that has been onboarded).
- `project-profile-slim.md` was previously generated but is now outdated (simulate by imagining the full profile was updated since the slim was last written — e.g., a new Common Gotchas entry was added).

## Action
Read `.claude/skills/df-cleanup/SKILL.md`. Inspect the step ordering.

## Expected Outcome
- The df-cleanup SKILL contains a "Slim File Refresh" step (Step 1.5 or equivalent) that appears BEFORE Step 2 (Promoted Test Health Check).
- The step instructs df-cleanup to: (a) check if `project-profile.md` exists, (b) if yes, regenerate `project-profile-slim.md` from it, (c) check if `code-map.md` exists, (d) if yes, regenerate `code-map-slim.md` from it (copying the git hash header from the full map).
- The step is labeled as occurring before the health check, not after.

## Failure Mode
If slim refresh happens after the health check: a promote-agent spawned by cleanup reads the stale slim file. The stale file might reference outdated hotspots or conventions, leading to a misaligned review.

## Notes
Validates FR-13, FR-14, BR-4, EC-3. The ordering assertion is the key distinction from H-05.

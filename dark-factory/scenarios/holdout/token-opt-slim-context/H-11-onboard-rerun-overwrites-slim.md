# Scenario: re-running onboard-agent overwrites the previous slim profile

## Type
edge-case

## Priority
medium — onboard-agent supports incremental refresh (re-run on an existing project). The slim profile must be overwritten with the new extraction, not appended to.

## Preconditions
- `onboard-agent.md` has been updated with the Phase 7.2 slim-generation step.
- Simulate: a previous run of onboard-agent produced `project-profile-slim.md` with 5 items in Common Gotchas.
- The developer accepts a refreshed full profile that changes Common Gotchas to 3 items.

## Action
Read `onboard-agent.md`. Verify the Phase 7.2 step specifies that the slim file is always written fresh from the current full profile — not appended to or merged with a previous version.

## Expected Outcome
- Phase 7.2 instructs the agent to overwrite `project-profile-slim.md` unconditionally — not to read the previous slim file first.
- There is no "merge with existing slim" logic.
- After a re-run, the slim profile reflects the state of the new full profile, not the old one.
- The Constraints section of onboard-agent allows writing `project-profile-slim.md` (it is listed as an output file).

## Failure Mode
If the slim file is appended to or merged: the slim profile grows over time and eventually becomes as large as or larger than the full profile, defeating the purpose entirely.

## Notes
Validates EC-9. Holdout because this tests idempotency of the slim generation step — a property not directly visible in the happy-path scenarios.

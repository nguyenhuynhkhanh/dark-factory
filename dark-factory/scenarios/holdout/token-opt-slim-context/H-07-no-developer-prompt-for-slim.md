# Scenario: onboard-agent does not prompt the developer for confirmation of the slim profile

## Type
edge-case

## Priority
medium — a spurious confirmation prompt for the slim file would interrupt every onboard run. The spec explicitly prohibits this (NFR-1, BR-6).

## Preconditions
- `onboard-agent.md` has been updated with the Phase 7.2 slim-generation step.

## Action
Read `.claude/agents/onboard-agent.md`. Search the Phase 7.2 section for any language that would trigger a confirmation prompt.

## Expected Outcome
- Phase 7.2 (or the slim-generation step) contains NO language asking the developer to confirm the slim profile before writing.
- There is NO `AskUserQuestion`, "ask the developer", "present... and ask", "confirm", or "sign-off" language in the slim-generation step.
- The slim-generation step is described as automatic / mechanical / immediate — it runs after the full profile is confirmed and writes without pausing.
- The Constraints section of onboard-agent continues to list `dark-factory/project-profile-slim.md` as a file the agent writes (alongside `project-profile.md`).

## Failure Mode
If a confirmation prompt is added for the slim file: every onboard run adds an extra developer interaction for no quality benefit. The full profile confirmation (Phase 7) already covers both files.

## Notes
Validates NFR-1, BR-6. This is holdout because it tests an absence of behavior (no prompt), not a presence. An implementer copying the Phase 7 sign-off pattern might inadvertently replicate it for Phase 7.2.

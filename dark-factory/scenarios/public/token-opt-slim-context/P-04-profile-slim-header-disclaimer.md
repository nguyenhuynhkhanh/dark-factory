# Scenario: project-profile-slim.md begins with the required header disclaimer

## Type
feature

## Priority
high — without the header disclaimer, consumers cannot distinguish the slim file from the full file.

## Preconditions
- `dark-factory/templates/project-profile-slim-template.md` exists.
- `onboard-agent.md` references the header line in its generation step.

## Action
Read `dark-factory/templates/project-profile-slim-template.md` and verify the header disclaimer line is present and exact.

## Expected Outcome
- The template begins with or prominently contains the exact line:
  `> Slim profile — generated from project-profile.md. For full context read project-profile.md.`
- `onboard-agent.md` includes this exact phrase or instructs the agent to begin the slim profile with this disclaimer.

## Notes
Validates FR-3. The disclaimer is a load-bearing contract: consumer agents check for it to confirm they are reading the slim file. The exact wording must match.

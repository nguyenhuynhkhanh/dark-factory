# Scenario: onboard-agent generates project-profile-slim.md

## Type
feature

## Priority
critical — the slim profile cannot exist without this generation step. If onboard-agent does not write it, every downstream consumer lacks the file.

## Preconditions
- `onboard-agent.md` has been updated to include the slim-profile generation phase (Phase 7.2).
- The agent definition references `dark-factory/project-profile-slim.md` as an output file.

## Action
Read `.claude/agents/onboard-agent.md` and inspect its content for the slim-profile generation step.

## Expected Outcome
- `onboard-agent.md` contains a reference to `project-profile-slim.md` as a file it writes.
- `onboard-agent.md` contains a phase or step (named Phase 7.2 or equivalent) that instructs the agent to generate the slim profile after writing the full profile.
- The phase is positioned after the full-profile write step (Phase 7) and before Phase 7.5 (Git Hook Setup).
- The generation step references `dark-factory/templates/project-profile-slim-template.md` as the structure guide.
- `plugins/dark-factory/agents/onboard-agent.md` is identical to `.claude/agents/onboard-agent.md`.

## Notes
Validates FR-1, AC-1. This is a content assertion against the agent definition file — not an execution test.

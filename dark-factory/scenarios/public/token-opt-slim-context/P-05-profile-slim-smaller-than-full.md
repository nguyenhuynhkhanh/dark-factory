# Scenario: project-profile-slim.md is materially smaller than project-profile.md

## Type
feature

## Priority
high — a slim file that is as large as the full file defeats the purpose.

## Preconditions
- The Dark Factory project itself has been onboarded and has both `dark-factory/project-profile.md` and `dark-factory/project-profile-slim.md` on disk (i.e., onboard-agent has been run after this spec lands).

## Action
Read both `dark-factory/project-profile.md` and `dark-factory/project-profile-slim.md`. Compare line counts.

## Expected Outcome
- `project-profile-slim.md` has fewer lines than `project-profile.md`.
- `project-profile-slim.md` is at most 50 lines (a generous upper bound above the 30-line target to allow for complex projects).
- `project-profile-slim.md` begins with the header disclaimer line.
- `project-profile-slim.md` contains a `## Tech Stack` section.
- `project-profile-slim.md` contains a `## Common Gotchas` section.

## Notes
Validates FR-4, AC-7. This is a runtime check against the actual generated files — run only after onboard-agent has been executed against the Dark Factory project.

# Scenario: project-profile-slim-template.md exists and defines all required sections

## Type
feature

## Priority
critical — onboard-agent reads this template to know what to generate. A missing or incomplete template produces malformed slim files.

## Preconditions
- `dark-factory/templates/project-profile-slim-template.md` has been created as part of this spec.

## Action
Check that the template file exists. Read its content.

## Expected Outcome
- `dark-factory/templates/project-profile-slim-template.md` exists.
- The file contains definitions for all four sections: Tech Stack, Critical Conventions, Entry Points, Common Gotchas.
- The file contains the exact header disclaimer text: `> Slim profile — generated from project-profile.md. For full context read project-profile.md.`
- The file states an extraction rule (source section name) for each slim section.
- `plugins/dark-factory/templates/project-profile-slim-template.md` exists and is identical to the source template.

## Notes
Validates FR-12, AC-5, AC-9. The template's existence and completeness locks the extraction contract for onboard-agent.

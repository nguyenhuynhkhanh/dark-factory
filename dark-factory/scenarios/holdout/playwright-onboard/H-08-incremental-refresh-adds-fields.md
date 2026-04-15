# Scenario: Incremental refresh adds missing UI/E2E fields to existing profile

## Type
feature

## Priority
high -- existing profiles generated before this feature will lack these fields

## Preconditions
- An existing `dark-factory/project-profile.md` exists with a Tech Stack table that does NOT contain UI Layer, Frontend Framework, E2E Framework, or E2E Ready rows
- Target project has React and Playwright installed

## Action
Run `/df-onboard` to trigger an incremental refresh.

## Expected Outcome
- The onboard-agent detects the missing fields in the existing profile
- During the section-by-section change presentation, the Tech Stack section shows four new rows being added
- If developer accepts: the profile is updated with the four new fields populated
- If developer rejects the Tech Stack changes: the old profile is preserved without the new fields

## Failure Mode (if applicable)
If the incremental refresh does not detect the new template fields as "changes," old profiles will never get UI/E2E information.

## Notes
Validates FR-7 and EC-8. This is the migration path for existing projects.

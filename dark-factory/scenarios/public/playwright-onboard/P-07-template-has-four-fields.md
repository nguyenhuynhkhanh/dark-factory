# Scenario: Project profile template includes all four new fields

## Type
feature

## Priority
critical -- structural requirement for the template

## Preconditions
- `dark-factory/templates/project-profile-template.md` exists

## Action
Read the project profile template file and inspect the Tech Stack table.

## Expected Outcome
- The `## Tech Stack` table contains rows for:
  - `UI Layer` with placeholder text
  - `Frontend Framework` with placeholder text
  - `E2E Framework` with placeholder text
  - `E2E Ready` with placeholder text
- The four rows appear after the existing `CI/CD` row
- Placeholder syntax matches existing rows (e.g., `{e.g., yes -- React 18 detected}`)

## Notes
Validates FR-5. This is a structural test -- the template file must contain the fields.

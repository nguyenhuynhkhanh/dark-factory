# Scenario: Multiple frontend frameworks detected in same project

## Type
edge-case

## Priority
medium -- monorepos and migration projects

## Preconditions
- Target project has a `package.json` with:
  - `"react": "^18.2.0"` in `dependencies`
  - `"vue": "^3.4.0"` in `dependencies`
  - `"@angular/core": "^17.0.0"` in `dependencies`

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- `UI Layer` = `yes`
- `Frontend Framework` = `React, Vue, Angular` (comma-separated, all detected frameworks listed)
- The order of listing does not matter as long as all are present

## Failure Mode (if applicable)
If the implementation returns only the first detected framework, the profile will be incomplete for monorepo projects.

## Notes
Validates BR-4.

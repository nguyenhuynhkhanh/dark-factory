# Scenario: Detect Cypress E2E framework from package.json

## Type
feature

## Priority
high -- validates E2E detection for the second supported framework

## Preconditions
- Target project has a `package.json` with:
  - `"vue": "^3.4.0"` in `dependencies`
  - `"cypress": "^13.0.0"` in `devDependencies`
- A `cypress.config.js` file exists at the project root

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- Profile `Tech Stack` table includes:
  - `UI Layer` = `yes`
  - `Frontend Framework` = `Vue`
  - `E2E Framework` = `Cypress`
  - `E2E Ready` = `yes`

## Notes
Validates FR-2, FR-3 for Cypress. Ensures the detection is not Playwright-specific.

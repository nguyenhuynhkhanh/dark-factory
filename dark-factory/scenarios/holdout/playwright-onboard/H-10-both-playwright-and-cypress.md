# Scenario: Both Playwright and Cypress detected

## Type
edge-case

## Priority
medium -- some projects use both during migration or for different test types

## Preconditions
- Target project has a `package.json` with:
  - `"@playwright/test": "^1.40.0"` in `devDependencies`
  - `"cypress": "^13.0.0"` in `devDependencies`
- Both `playwright.config.ts` and `cypress.config.js` exist

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- `E2E Framework` = `Playwright, Cypress` (comma-separated)
- `E2E Ready` = `yes` (at least one framework has both dependency and config)

## Notes
Validates BR-5.

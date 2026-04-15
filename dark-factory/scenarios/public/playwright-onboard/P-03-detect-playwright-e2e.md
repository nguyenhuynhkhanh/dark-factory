# Scenario: Detect Playwright E2E framework from package.json

## Type
feature

## Priority
critical -- core happy path for E2E detection

## Preconditions
- Target project has a `package.json` with:
  - `"react": "^18.2.0"` in `dependencies`
  - `"@playwright/test": "^1.40.0"` in `devDependencies`
- A `playwright.config.ts` file exists at the project root

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- Profile `Tech Stack` table includes:
  - `UI Layer` = `yes`
  - `Frontend Framework` = `React`
  - `E2E Framework` = `Playwright`
  - `E2E Ready` = `yes`

## Notes
Validates FR-2, FR-3, and FR-6. Both the dependency AND config file are present, so E2E Ready is `yes`.

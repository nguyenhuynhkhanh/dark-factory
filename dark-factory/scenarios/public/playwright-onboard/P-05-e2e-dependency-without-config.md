# Scenario: E2E framework dependency exists but no config file

## Type
edge-case

## Priority
high -- common situation when a developer installs but has not configured yet

## Preconditions
- Target project has a `package.json` with `"@playwright/test": "^1.40.0"` in `devDependencies`
- No `playwright.config.*` file exists anywhere in the project
- React is in dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- Profile `Tech Stack` table includes:
  - `UI Layer` = `yes`
  - `Frontend Framework` = `React`
  - `E2E Framework` = `Playwright`
  - `E2E Ready` = `no`
- The distinction: E2E Framework is detected (dependency exists) but E2E Ready is `no` (no config file)

## Notes
Validates FR-6 (E2E Ready requires BOTH dependency AND config). This is EC-2.

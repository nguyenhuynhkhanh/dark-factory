# Scenario: Detect React frontend framework from package.json

## Type
feature

## Priority
critical -- core happy path for the most common frontend framework

## Preconditions
- Target project has a `package.json` with `"react": "^18.2.0"` in `dependencies`
- No Playwright or Cypress dependencies
- No E2E config files

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

The onboard-agent reads `package.json`, scans dependencies and devDependencies against the frontend framework allowlist.

## Expected Outcome
- Profile `Tech Stack` table includes:
  - `UI Layer` = `yes`
  - `Frontend Framework` = `React`
  - `E2E Framework` = `none`
  - `E2E Ready` = `no`
- No developer question about UI layer is asked (framework detection is unambiguous)

## Notes
This validates FR-1 and BR-2. React is the most common case and should work from either `dependencies` or `devDependencies`.

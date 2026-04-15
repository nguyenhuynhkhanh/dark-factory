# Scenario: Detect Next.js frontend framework from package.json

## Type
feature

## Priority
high -- Next.js is the second most common framework, validates allowlist breadth

## Preconditions
- Target project has a `package.json` with `"next": "^14.0.0"` in `dependencies`
- No Playwright or Cypress dependencies
- No E2E config files

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

The onboard-agent reads `package.json`, scans dependencies against the frontend framework allowlist.

## Expected Outcome
- Profile `Tech Stack` table includes:
  - `UI Layer` = `yes`
  - `Frontend Framework` = `Next.js`
  - `E2E Framework` = `none`
  - `E2E Ready` = `no`

## Notes
Validates FR-1 and BR-2 for a meta-framework (Next.js wraps React but is its own entry in the allowlist).

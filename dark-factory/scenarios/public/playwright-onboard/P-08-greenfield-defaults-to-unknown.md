# Scenario: Greenfield project defaults all fields to unknown

## Type
edge-case

## Priority
high -- greenfield is a documented onboard path

## Preconditions
- Target project directory contains only Dark Factory scaffolding (no source code, no `package.json`)

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- Profile `Tech Stack` table includes:
  - `UI Layer` = `unknown`
  - `Frontend Framework` = `unknown`
  - `E2E Framework` = `unknown`
  - `E2E Ready` = `unknown`
- During Phase 6 developer questions, the onboard-agent asks about intended UI layer

## Notes
Validates BR-8. Cannot detect what does not exist yet.

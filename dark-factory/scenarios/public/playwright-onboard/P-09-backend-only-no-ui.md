# Scenario: Backend-only project with no UI signals

## Type
feature

## Priority
high -- the primary "negative" detection case

## Preconditions
- Target project has a `package.json` with `"express": "^4.18.0"` and `"mongoose": "^8.0.0"` in `dependencies`
- No frontend framework packages in dependencies or devDependencies
- No `.html`, `.jsx`, `.tsx`, `.vue`, `.svelte` files in the project
- No Playwright or Cypress dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- Profile `Tech Stack` table includes:
  - `UI Layer` = `no`
  - `Frontend Framework` = `none`
  - `E2E Framework` = `none`
  - `E2E Ready` = `no`
- No developer question about UI layer is asked (no ambiguous signals)

## Notes
Validates EC-7 and BR-6. Pure backend project, no ambiguity, no question needed.

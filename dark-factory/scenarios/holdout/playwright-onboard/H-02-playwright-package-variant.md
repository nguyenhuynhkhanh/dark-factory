# Scenario: Detect `playwright` package (not `@playwright/test`)

## Type
edge-case

## Priority
medium -- the `playwright` package (without `/test`) is used for browser automation outside testing

## Preconditions
- Target project has a `package.json` with `"playwright": "^1.40.0"` in `dependencies` (not `@playwright/test`)
- A `playwright.config.js` file exists
- React is in dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- `E2E Framework` = `Playwright`
- `E2E Ready` = `yes`

## Failure Mode (if applicable)
If the implementation only checks for `@playwright/test` and not `playwright`, this will be missed.

## Notes
Validates FR-2 and BR-3. The `playwright` base package is in the allowlist alongside `@playwright/test`.

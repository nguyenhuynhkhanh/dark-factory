# Scenario: Playwright dependency without config file means E2E Ready = no

## Type
edge-case

## Priority
high -- validates the two-signal requirement for E2E Ready

## Preconditions
- Target project has `"@playwright/test": "^1.40.0"` in `devDependencies`
- NO `playwright.config.*` file exists anywhere in the project
- React in dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- `E2E Framework` = `Playwright`
- `E2E Ready` = `no`

## Failure Mode (if applicable)
If E2E Ready is set to `yes` based on dependency alone (ignoring config requirement), downstream agents may assume Playwright is fully configured when it is not.

## Notes
Validates EC-2 and FR-6.

# Scenario: Playwright config exists but dependency not in package.json (global install)

## Type
edge-case

## Priority
medium -- uncommon but valid setup

## Preconditions
- Target project has a `package.json` with NO `@playwright/test` or `playwright` in dependencies or devDependencies
- A `playwright.config.ts` file exists at project root
- React in dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- `E2E Framework` = `Playwright` (inferred from config file presence)
- `E2E Ready` = `yes` (config presence is sufficient when the config file exists)

## Failure Mode (if applicable)
If detection only checks package.json and ignores config files, globally-installed Playwright will be missed entirely.

## Notes
Validates EC-3. Some teams install Playwright globally or via CI scripts rather than as a project dependency.

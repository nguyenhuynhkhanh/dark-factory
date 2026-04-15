# Scenario: React in devDependencies only (not dependencies)

## Type
edge-case

## Priority
high -- common in SSR/build-only setups, tests EC-1

## Preconditions
- Target project has a `package.json` with `"react": "^18.2.0"` in `devDependencies` only (not in `dependencies`)
- No other frontend framework packages

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- `UI Layer` = `yes`
- `Frontend Framework` = `React`
- React is detected even though it is in devDependencies, not dependencies

## Failure Mode (if applicable)
If the implementation only scans `dependencies` and ignores `devDependencies`, React will not be detected and `UI Layer` will incorrectly be `no`.

## Notes
Validates EC-1. Many projects (especially those using Next.js or custom builds) put React in devDependencies.

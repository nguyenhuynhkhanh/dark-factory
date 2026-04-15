# Scenario: Monorepo scans root package.json only

## Type
edge-case

## Priority
medium -- clarifies monorepo scope limitation

## Preconditions
- Target project is a monorepo with:
  - Root `package.json` with NO frontend framework dependencies
  - `packages/web/package.json` with `"react": "^18.2.0"` in dependencies
  - `packages/api/package.json` with `"express": "^4.18.0"` in dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- Detection is based on the ROOT `package.json` only
- Since root has no frontend framework: ambiguity question may be triggered if web package has `.tsx` files visible from root
- `Frontend Framework` = `none` (from root package.json perspective)

## Failure Mode (if applicable)
If the implementation recursively scans all package.json files, it may produce correct results but violate the scope constraint (EC-4 says root only).

## Notes
Validates EC-4. Monorepo sub-package detection is explicitly out of scope.

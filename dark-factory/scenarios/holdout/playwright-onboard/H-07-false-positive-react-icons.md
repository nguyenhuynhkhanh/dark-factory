# Scenario: Package with "react" in name but not React itself

## Type
edge-case

## Priority
high -- validates the allowlist approach prevents false positives

## Preconditions
- Target project has a `package.json` with:
  - `"react-icons": "^5.0.0"` in `dependencies`
  - `"react-helmet": "^6.1.0"` in `dependencies`
  - NO `"react"` as a standalone dependency
- No other frontend framework packages
- No `.jsx` or `.tsx` files (pure backend that imported these packages erroneously or for SSR utilities)

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- `UI Layer` = `no` (or triggers ambiguity question if template files exist)
- `Frontend Framework` = `none`
- `react-icons` and `react-helmet` are NOT matched because the allowlist requires exact package name matches, not substring matches

## Failure Mode (if applicable)
If detection uses substring matching (e.g., `includes("react")`), `react-icons` would false-positive as React.

## Notes
Validates BR-1. The allowlist must use exact package name matching.

# Scenario: .tsx files present but no React dependency triggers ambiguity question

## Type
edge-case

## Priority
high -- tests the ambiguity detection path

## Preconditions
- Target project has a `package.json` with `"solid-js": "^1.8.0"` NOT in the allowlist (wait -- solid-js IS in the allowlist per BR-2)
- Correction: Target project has a `package.json` with `"preact": "^10.0.0"` in dependencies (Preact is NOT in the allowlist)
- Project contains 20+ `.tsx` files
- No other frontend framework from the allowlist in dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

## Expected Outcome
- The onboard-agent detects `.tsx` files but no allowlisted framework
- During Phase 6, the developer is asked whether the project has a UI layer
- If developer says yes: `UI Layer` = `yes`, `Frontend Framework` = `none`

## Failure Mode (if applicable)
If `.tsx` presence is not checked as an ambiguity signal, Preact projects will silently get `UI Layer` = `no`.

## Notes
Validates EC-6 and FR-4. Preact uses `.tsx` files but is not in the framework allowlist.

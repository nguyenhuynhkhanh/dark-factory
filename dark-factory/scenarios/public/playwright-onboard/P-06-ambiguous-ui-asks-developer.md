# Scenario: Ambiguous UI layer triggers developer question

## Type
feature

## Priority
high -- ensures the fallback detection path works

## Preconditions
- Target project has a `package.json` with `"express": "^4.18.0"` in `dependencies` (no frontend framework)
- Project contains 15+ `.html` files in a `public/` or `views/` directory
- No Playwright or Cypress dependencies

## Action
Run `/df-onboard` which spawns onboard-agent to analyze the project.

The onboard-agent finds no frontend framework in the allowlist but detects meaningful `.html` file presence.

## Expected Outcome
- During Phase 6 (developer questions), the onboard-agent asks whether the project has a UI layer
- If developer answers "yes": `UI Layer` = `yes`, `Frontend Framework` = `none` (no framework, but UI exists)
- If developer answers "no": `UI Layer` = `no`, `Frontend Framework` = `none`
- The question is batched with other Phase 6 developer questions, not asked separately

## Notes
Validates FR-4 and BR-7. The question must be part of the existing Phase 6 batch.

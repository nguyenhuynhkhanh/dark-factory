# Scenario: codemap-agent explicitly names sections excluded from the slim map

## Type
feature

## Priority
high — the exclusion list is as important as the inclusion list. Implementers need explicit names to avoid accidentally copying entire maps.

## Preconditions
- `codemap-agent.md` has been updated with the slim-map generation step.

## Action
Read `.claude/agents/codemap-agent.md` and inspect the list of excluded sections for `code-map-slim.md`.

## Expected Outcome
- `codemap-agent.md` explicitly names at least the following sections as excluded from `code-map-slim.md`:
  - Entry Point Traces
  - Interface/Contract Boundaries (or "Interface/Contract Boundaries")
  - Cross-Cutting Concerns
  - Circular Dependencies
  - Dynamic/Runtime Dependencies
- The exclusion is stated as a list (not implied), so an implementer reading it cannot accidentally include the sections.

## Notes
Validates FR-10, AC-8. Content assertion against the codemap-agent definition.

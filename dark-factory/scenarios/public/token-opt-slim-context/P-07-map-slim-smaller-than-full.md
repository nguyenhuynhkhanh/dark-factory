# Scenario: code-map-slim.md is materially smaller than code-map.md

## Type
feature

## Priority
high — size reduction is the primary value proposition of the slim files.

## Preconditions
- The Dark Factory project has both `dark-factory/code-map.md` and `dark-factory/code-map-slim.md` on disk (codemap-agent has been run after this spec lands).

## Action
Read both `dark-factory/code-map.md` and `dark-factory/code-map-slim.md`. Compare line counts and check for excluded sections.

## Expected Outcome
- `code-map-slim.md` has fewer lines than `code-map.md`.
- `code-map-slim.md` is at most 40 lines (generous upper bound above the 25-line target).
- `code-map-slim.md` does NOT contain any of the following section headings: `## Entry Point Traces`, `## Interface/Contract Boundaries`, `## Cross-Cutting Concerns`, `## Circular Dependencies`, `## Dynamic/Runtime Dependencies`.
- `code-map-slim.md` DOES contain `## Shared Dependency Hotspots` and `## Module Dependency Graph`.

## Notes
Validates FR-9, FR-10, AC-8. Runtime check against actual generated files.

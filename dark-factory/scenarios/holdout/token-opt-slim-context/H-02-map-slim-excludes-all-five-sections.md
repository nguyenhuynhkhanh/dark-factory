# Scenario: code-map-slim.md excludes all five out-of-scope sections — verified individually

## Type
edge-case

## Priority
high — an implementer might exclude four sections but accidentally leave one in, especially if the section names vary slightly between projects.

## Preconditions
- `dark-factory/code-map-slim.md` exists on disk (codemap-agent has run after this spec landed).
- The Dark Factory project's full code map contains all five out-of-scope sections.

## Action
Read `dark-factory/code-map-slim.md`. Check for the presence of each excluded section heading individually.

## Expected Outcome
- `code-map-slim.md` does NOT contain `## Entry Point Traces`
- `code-map-slim.md` does NOT contain `## Interface/Contract Boundaries`
- `code-map-slim.md` does NOT contain `## Cross-Cutting Concerns`
- `code-map-slim.md` does NOT contain `## Circular Dependencies`
- `code-map-slim.md` does NOT contain `## Dynamic/Runtime Dependencies`
- `code-map-slim.md` DOES contain `## Shared Dependency Hotspots`
- `code-map-slim.md` DOES contain `## Module Dependency Graph`

## Failure Mode
If any excluded section appears: the slim file is not slim — consumers loading it for blast-radius review are paying the token cost for sections they do not need.

## Notes
Validates FR-10, EC-10, AC-8. Holdout because P-07 covers the line-count check; this scenario verifies each section heading individually. An implementer reading P-07 might ensure general size reduction without verifying the specific section exclusion.

# Scenario: code-map-slim.md contains required sections and correct header

## Type
feature

## Priority
critical — a slim map without hotspots and the dependency graph is useless for blast-radius review.

## Preconditions
- `codemap-agent.md` has been updated with the slim-map generation step.

## Action
Read `.claude/agents/codemap-agent.md` and inspect the slim-map generation instructions.

## Expected Outcome
- `codemap-agent.md` specifies that `code-map-slim.md` must include:
  - A header disclaimer line: `> Slim map — generated from code-map.md. For full context read code-map.md.`
  - The `Git hash:` header (same value as `code-map.md`)
  - `## Shared Dependency Hotspots` section — verbatim copy from the full map
  - `## Module Dependency Graph` section — names + arrow targets only
- `codemap-agent.md` specifies that `code-map-slim.md` must NOT include Entry Point Traces, Interface/Contract Boundaries, Cross-Cutting Concerns, Circular Dependencies, or Dynamic/Runtime Dependencies.

## Notes
Validates FR-6, FR-7, FR-8, FR-10, AC-2, AC-3, AC-8. Content assertion against codemap-agent definition.

# Scenario: onboard-agent Code Map Template is NOT extracted in Phase 1

## Type
edge-case

## Priority
high — the code map template is part of Phase 3.5 process logic, not Phase 1 scope

## Preconditions
- Phase 1 implementation is complete
- onboard-agent.md has been modified

## Action
Read `.claude/agents/onboard-agent.md` and verify the Code Map Template is still inline.

## Expected Outcome
- The agent file still contains the Code Map Template section with:
  - `# Code Map` header
  - `## Module Dependency Graph`
  - `## Entry Point Traces`
  - `## Shared Dependency Hotspots`
  - `## Interface/Contract Boundaries`
  - `## Cross-Cutting Concerns`
  - `## Circular Dependencies`
  - `## Dynamic/Runtime Dependencies`
- Only the Project Profile Template was extracted; the Code Map Template remains inline

## Notes
Phase 1 scope is limited to extracting 3 output templates. The code map template is a sub-template within a process phase and is not in scope.

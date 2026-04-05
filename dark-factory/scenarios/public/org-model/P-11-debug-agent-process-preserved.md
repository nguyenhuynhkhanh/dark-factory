# Scenario: debug-agent investigation phases and constraints preserved after extraction

## Type
regression

## Priority
high — ensures the extraction only removed the template, not investigation instructions

## Preconditions
- Phase 1 implementation is complete
- debug-agent.md has been modified

## Action
Read `.claude/agents/debug-agent.md` and verify key non-template content is present.

## Expected Outcome
The following content is still present in debug-agent.md:
- Frontmatter with `name: debug-agent`
- "Phase 1: Understand the Report" section
- "Phase 2: Investigate the Codebase" section
- "Phase 3: Root Cause Analysis" section
- "Phase 4: Impact Analysis" section
- "Phase 5: Write the Debug Report" section
- "Phase 6: Write Regression Scenarios" section
- Variant scenario requirements section
- "Re-spawn During Architect Review" section
- "Constraints" section with all NEVER/ALWAYS rules

## Notes
Corresponds to BR-5, NFR-2.

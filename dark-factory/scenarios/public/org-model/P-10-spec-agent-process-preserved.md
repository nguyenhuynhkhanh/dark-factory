# Scenario: spec-agent process phases and scenario format preserved after extraction

## Type
regression

## Priority
high — ensures the extraction only removed the template, not process instructions

## Preconditions
- Phase 1 implementation is complete
- spec-agent.md has been modified

## Action
Read `.claude/agents/spec-agent.md` and verify key non-template content is present.

## Expected Outcome
The following content is still present in spec-agent.md:
- Frontmatter with `name: spec-agent`
- "Phase 1: Understand the Request" section
- "Phase 2: Scope Discovery" section
- "Phase 3: Challenge and Refine" section
- "Phase 4: Write the Spec" section
- "Phase 5: Write Production-Grade Scenarios" section
- Scenario Format section (the scenario template, which is separate from the spec template)
- "Re-spawn During Architect Review" section
- "Constraints" section with all NEVER/ALWAYS rules

## Notes
Corresponds to BR-5, NFR-2. Pipeline behavior must be identical.

# Scenario: onboard-agent scanning phases and constraints preserved after extraction

## Type
regression

## Priority
high — ensures the extraction only removed the profile template, not scanning/synthesis logic

## Preconditions
- Phase 1 implementation is complete
- onboard-agent.md has been modified

## Action
Read `.claude/agents/onboard-agent.md` and verify key non-template content is present.

## Expected Outcome
The following content is still present in onboard-agent.md:
- Frontmatter with `name: onboard-agent`
- "Phase 1: Project Detection" section
- "Phase 2: Tech Stack & Dependencies" section
- "Phase 3: Architecture & Patterns" section
- "Phase 3.5: Code Map Construction" section (including scanner spawning, synthesis steps, code map template)
- "Phase 4: Quality Bar" section
- "Phase 5: Structural Assessment" section
- "Phase 6: Ask the Developer" section
- "Phase 7: Developer Sign-Off and Write the Project Profile" section
- "Phase 7.5: Optional Git Hook Setup" section
- "Phase 8: Configure Agent Permissions" section
- "Constraints" section with all NEVER/ONLY rules
- Scanner prompt content (this is NOT the profile template; it is agent process logic)

## Notes
Corresponds to BR-5, NFR-2. The code map template inside Phase 3.5 is NOT extracted in Phase 1 -- only the project profile template is extracted.

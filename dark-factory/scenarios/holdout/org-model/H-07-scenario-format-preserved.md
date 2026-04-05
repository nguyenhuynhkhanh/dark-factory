# Scenario: spec-agent Scenario Format section is preserved (not accidentally extracted with the spec template)

## Type
edge-case

## Priority
high — the Scenario Format is process logic, not an output template; extracting it would break scenario writing

## Preconditions
- Phase 1 implementation is complete
- spec-agent.md has been modified

## Action
Read `.claude/agents/spec-agent.md` and check for the Scenario Format section.

## Expected Outcome
- The agent file still contains the "## Scenario Format" section (or equivalent) with:
  - `# Scenario: {title}`
  - `## Type`
  - `## Priority`
  - `## Preconditions`
  - `## Action`
  - `## Expected Outcome`
  - `## Failure Mode`
  - `## Notes`
- This section is agent process instructions, NOT an output template -- it tells the agent how to write scenarios, not how to structure specs

## Notes
The Scenario Format block is adjacent to the Feature Spec Template in the original file. An overzealous extraction could accidentally remove both.

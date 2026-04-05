# Scenario: spec-agent "Re-spawn During Architect Review" section preserved

## Type
regression

## Priority
high — the re-spawn section is critical for the architect review loop; losing it breaks iteration

## Preconditions
- Phase 1 implementation is complete
- spec-agent.md has been modified

## Action
Read `.claude/agents/spec-agent.md` and search for the re-spawn section.

## Expected Outcome
- The section "Re-spawn During Architect Review (IMPORTANT)" is present
- It contains instructions for:
  - Reading architect's feedback
  - Reading the CURRENT spec file
  - Updating the spec
  - MANDATORY scenario coverage check
  - Reading existing scenarios before adding new ones

## Notes
This section is adjacent to the template in the original file and could be accidentally removed during extraction.

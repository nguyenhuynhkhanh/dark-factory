# Scenario: spec-agent.md no longer contains the full inline spec template

## Type
feature

## Priority
high — verifies the template was actually removed, not just duplicated with a reference added

## Preconditions
- Phase 1 implementation is complete

## Action
Read `.claude/agents/spec-agent.md` and search for distinctive template markers that should only appear in the extracted template, not the agent:
- `## Data Model` as a standalone section header (not inside a reference instruction)
- `## API Endpoints` with the table structure
- `| POST | /api/v1/... |`
- `## Implementation Size Estimate`

## Expected Outcome
- The agent file does NOT contain the full feature spec template block (lines that were between the ` ```md ` fences under `### Feature Spec Template`)
- The agent file DOES contain a reference instruction like "Read the spec output template from `dark-factory/templates/spec-template.md`"
- The Scenario Format section (separate from the spec template) may or may not be extracted depending on implementation choice

## Notes
Corresponds to BR-2, FR-1.

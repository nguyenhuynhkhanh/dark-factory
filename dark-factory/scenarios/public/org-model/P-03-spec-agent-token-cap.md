# Scenario: spec-agent.md is under its token cap after template extraction

## Type
feature

## Priority
high — token caps are the measurable outcome of the refactoring; exceeding them means the extraction was insufficient

## Preconditions
- Phase 1 implementation is complete
- spec-agent.md has had its inline spec template removed and replaced with a file reference

## Action
Read `.claude/agents/spec-agent.md` and calculate its token count using the approximation `Math.ceil(content.length / 4)`.

## Expected Outcome
- Token count is at or below 4,000 tokens (the cap from the Resource Budgets table)
- The agent file still contains all non-template content (process phases, guiding principles, constraints, scenario format)

## Notes
Corresponds to AC-7, BR-1. The cap applies to the agent file itself, NOT agent + template combined (EC-2).

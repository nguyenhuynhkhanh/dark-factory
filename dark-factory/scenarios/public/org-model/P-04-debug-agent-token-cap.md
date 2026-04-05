# Scenario: debug-agent.md is under its token cap after template extraction

## Type
feature

## Priority
high — ensures debug-agent achieved its token reduction target

## Preconditions
- Phase 1 implementation is complete
- debug-agent.md has had its inline debug report template removed and replaced with a file reference

## Action
Read `.claude/agents/debug-agent.md` and calculate its token count using the approximation `Math.ceil(content.length / 4)`.

## Expected Outcome
- Token count is at or below 3,000 tokens (the cap from the Resource Budgets table)
- The agent file still contains all non-template content (investigation phases, guiding principles, constraints, re-spawn instructions)

## Notes
Corresponds to AC-7, BR-1.

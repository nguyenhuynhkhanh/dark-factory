# Scenario: onboard-agent.md is under its token cap after template extraction

## Type
feature

## Priority
high — onboard-agent is the largest agent; template extraction is critical for its token budget

## Preconditions
- Phase 1 implementation is complete
- onboard-agent.md has had its inline project profile template removed and replaced with a file reference

## Action
Read `.claude/agents/onboard-agent.md` and calculate its token count using the approximation `Math.ceil(content.length / 4)`.

## Expected Outcome
- Token count is at or below 4,000 tokens (the cap from the Resource Budgets table)
- Note: onboard-agent will need further reduction in Phase 2 (codemap extraction) to hit its cap; Phase 1 alone may not be sufficient. The cap test should still be present but may need adjustment if Phase 1 alone does not bring it under cap.

## Notes
Corresponds to AC-7, BR-1. Onboard-agent has the most content to extract across Phases 1 and 2.

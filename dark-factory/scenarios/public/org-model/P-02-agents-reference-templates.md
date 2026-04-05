# Scenario: Agents reference template files by path instead of embedding them

## Type
feature

## Priority
critical — the core mechanism for token savings; agents must instruct LLMs to read templates at runtime

## Preconditions
- Phase 1 implementation is complete
- Template files exist in `dark-factory/templates/`

## Action
Read the content of each modified agent file:
- `.claude/agents/spec-agent.md`
- `.claude/agents/debug-agent.md`
- `.claude/agents/onboard-agent.md`

## Expected Outcome
- Each agent contains a reference instruction pointing to its template file path:
  - spec-agent.md references `dark-factory/templates/spec-template.md`
  - debug-agent.md references `dark-factory/templates/debug-report-template.md`
  - onboard-agent.md references `dark-factory/templates/project-profile-template.md`
- None of the 3 agents contain their full inline template content (the multi-line markdown template blocks are removed)

## Notes
Corresponds to AC-2 and BR-2. The reference must be a path-based instruction, not content embedding.

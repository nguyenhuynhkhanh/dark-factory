# Scenario: Template files mirror source agent/skill/rule changes

## Type
feature

## Priority
high -- ensures new projects get the updated pipeline

## Preconditions
- Changes have been made to:
  - `.claude/skills/df-orchestrate/SKILL.md`
  - `.claude/agents/architect-agent.md`
  - `.claude/agents/code-agent.md`
  - `.claude/rules/dark-factory.md`

## Action
Verify that corresponding template files are updated.

## Expected Outcome
- `template/.claude/skills/df-orchestrate/SKILL.md` contains the same review gating logic as the source
- `template/.claude/agents/architect-agent.md` contains the same domain parameterization as the source
- `template/.claude/agents/code-agent.md` contains the architect findings input section
- `template/.claude/rules/dark-factory.md` contains the updated pipeline descriptions
- Content in template files matches the source files (they should be identical or functionally equivalent)

## Notes
The `bin/cli.js` copies from `template/` during installation. If templates are out of sync, new projects will get the old pipeline behavior. This was the exact problem the legacy init script had.

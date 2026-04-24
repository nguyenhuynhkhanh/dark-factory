# Scenario: all modified/created files have exact plugin mirrors

## Type
feature

## Priority
critical — plugin mirror parity is enforced by existing contract tests. A missing mirror breaks the existing test suite.

## Preconditions
- This spec's implementation has landed: onboard-agent, codemap-agent, df-cleanup SKILL, and the slim template have all been updated/created.

## Action
Compare the following source-and-mirror pairs for byte-for-byte equality:
1. `.claude/agents/onboard-agent.md` vs `plugins/dark-factory/agents/onboard-agent.md`
2. `.claude/agents/codemap-agent.md` vs `plugins/dark-factory/agents/codemap-agent.md`
3. `dark-factory/templates/project-profile-slim-template.md` vs `plugins/dark-factory/templates/project-profile-slim-template.md`
4. `.claude/skills/df-cleanup/SKILL.md` vs `plugins/dark-factory/skills/df-cleanup/SKILL.md`

## Expected Outcome
- All four pairs are byte-for-byte identical.
- `node --test tests/dark-factory-contracts.test.js` passes.

## Notes
Validates FR-15, BR-5, AC-9. This can be run as: `diff .claude/agents/onboard-agent.md plugins/dark-factory/agents/onboard-agent.md` etc.

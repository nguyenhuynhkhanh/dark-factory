# Scenario: Plugin mirror agents match modified source agents

## Type
feature

## Priority
high — plugin mirrors are the distribution mechanism; mismatches break downstream consumers

## Preconditions
- Phase 1 implementation is complete
- Source agents in `.claude/agents/` have been modified
- Plugin mirrors in `plugins/dark-factory/agents/` exist

## Action
Compare source agent files to their plugin mirrors:
- `.claude/agents/spec-agent.md` vs `plugins/dark-factory/agents/spec-agent.md`
- `.claude/agents/debug-agent.md` vs `plugins/dark-factory/agents/debug-agent.md`
- `.claude/agents/onboard-agent.md` vs `plugins/dark-factory/agents/onboard-agent.md`

## Expected Outcome
- Each source agent file is byte-identical to its plugin mirror
- Existing plugin parity tests in `dark-factory-contracts.test.js` still pass

## Notes
The plugin directory must also contain the template files if the plugin structure supports it.

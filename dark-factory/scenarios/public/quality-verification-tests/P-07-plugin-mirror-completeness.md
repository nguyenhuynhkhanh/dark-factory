# Scenario: All 8 missing plugin mirror tests pass with byte-identical comparison

## Type
feature

## Priority
critical — plugin drift means users get stale agent behavior

## Preconditions
- All source files exist in `.claude/agents/` and `.claude/skills/`
- All corresponding plugin files exist in `plugins/dark-factory/agents/` and `plugins/dark-factory/skills/`

## Action
Run the contract test suite and check the plugin mirror completeness tests.

## Expected Outcome
- 8 tests, one per untested mirror pair:
  1. `architect-agent.md` source matches plugin
  2. `spec-agent.md` source matches plugin
  3. `debug-agent.md` source matches plugin
  4. `test-agent.md` source matches plugin
  5. `df-onboard/SKILL.md` source matches plugin
  6. `df-scenario/SKILL.md` source matches plugin
  7. `df-spec/SKILL.md` source matches plugin
  8. `df/SKILL.md` source matches plugin
- Each test uses `assert.strictEqual(source, plugin)` for byte-identical comparison
- Test error messages clearly identify which file pair diverged

## Notes
These complement the existing 7 mirror tests in `dark-factory-setup.test.js` (sections 12, 19). Together they cover all 15 source/plugin pairs. The existing tests cover: df-orchestrate SKILL, df-intake SKILL, dark-factory.md rules, promote-agent, code-agent, df-cleanup SKILL, onboard-agent. The `df-debug/SKILL.md` mirror is also untested in the existing file — verify this is included in the 8 above. Actually, reviewing the confirmed scope again: the 8 listed are architect-agent, spec-agent, debug-agent, test-agent, df-onboard, df-scenario, df-spec, df. The df-debug SKILL is NOT in the 8 — check if it already has a test or was intentionally excluded.

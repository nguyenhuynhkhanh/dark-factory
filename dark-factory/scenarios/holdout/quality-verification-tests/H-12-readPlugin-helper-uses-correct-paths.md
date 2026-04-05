# Scenario: readPlugin helper constructs correct paths to plugin directory

## Type
edge-case

## Priority
high — wrong path means mirror tests compare the wrong files

## Preconditions
- `tests/dark-factory-contracts.test.js` exists

## Action
Read the test file and check the `readPlugin()` helper (or equivalent plugin-reading logic):
1. For agents: must read from `plugins/dark-factory/agents/{name}.md`
2. For skills: must read from `plugins/dark-factory/skills/{name}/SKILL.md`
3. The helper must NOT read from `.claude/agents/` or `.claude/skills/` when reading plugin copies

Also verify:
4. `readAgent()` helper reads from `.claude/agents/{name}.md` (source, not plugin)
5. `readSkill()` helper reads from `.claude/skills/{name}/SKILL.md` (source, not plugin)
6. The helpers are defined locally in the file (not imported from external modules)

## Expected Outcome
- Plugin paths use `plugins/dark-factory/` prefix
- Source paths use `.claude/` prefix  
- No path confusion between source and plugin directories
- Helpers are self-contained in the test file
- This validates EC-5 and NFR-3

## Notes
Path confusion between source and plugin would make mirror tests compare a file with itself, always passing but never detecting drift.

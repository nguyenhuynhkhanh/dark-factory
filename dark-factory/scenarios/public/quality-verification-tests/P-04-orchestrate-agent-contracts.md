# Scenario: df-orchestrate to architect/code/test/promote agent contracts pass

## Type
feature

## Priority
critical — orchestration contracts are the backbone of the implementation pipeline

## Preconditions
- `.claude/skills/df-orchestrate/SKILL.md` exists
- `.claude/agents/architect-agent.md`, `code-agent.md`, `test-agent.md`, `promote-agent.md` all exist

## Action
Run the contract test suite and check the orchestration contract tests (handoffs 5, 7, 8, 9).

## Expected Outcome
- **Handoff 5 (orchestrate -> architect)**: Tests verify df-orchestrate references `architect-agent.md`, passes spec path and domain parameter. Architect-agent outputs review files with status APPROVED/BLOCKED that df-orchestrate reads.
- **Handoff 7 (orchestrate -> code-agent)**: Tests verify df-orchestrate passes spec content and public scenarios to code-agent. Tests verify architect findings sections ("Key Decisions Made", "Remaining Notes") are referenced in both df-orchestrate (as forwarded content) and code-agent (as expected input).
- **Handoff 8 (orchestrate -> test-agent)**: Tests verify df-orchestrate passes feature name and spec path. Test-agent reads holdout scenarios from `dark-factory/scenarios/holdout/{feature}/` and writes results to `dark-factory/results/{feature}/`.
- **Handoff 9 (orchestrate -> promote-agent)**: Tests verify df-orchestrate passes feature name and results path. Promote-agent reads from `dark-factory/results/` and writes to `dark-factory/promoted-tests.json`.

## Notes
These 4 handoffs form the core implementation loop. Each should have 2-3 assertions verifying path consistency and format agreement.

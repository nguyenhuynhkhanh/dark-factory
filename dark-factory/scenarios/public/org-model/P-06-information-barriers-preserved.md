# Scenario: Information barriers remain in individual agent files after Phase 1

## Type
feature

## Priority
critical — information barriers are a security-critical concern; moving or losing them breaks pipeline isolation

## Preconditions
- Phase 1 implementation is complete
- spec-agent.md, debug-agent.md, and onboard-agent.md have been modified

## Action
Read each modified agent file and verify information barrier declarations are present:
- spec-agent.md: `NEVER read` + `holdout`, `NEVER modify source code`, `NEVER read` + `results`
- debug-agent.md: `NEVER modify source code`, `NEVER read` + `holdout`, `NEVER read` + `results`
- onboard-agent.md: `NEVER modify source code`, `NEVER modify test files`

## Expected Outcome
- All barrier declarations listed above are still present in their respective agent files
- No barrier declarations have been moved to template files or shared rules

## Notes
Corresponds to AC-10, BR-3, FR-6. Barriers must be in the spawned agent's direct context.

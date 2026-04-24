# Scenario: codemap-agent generates code-map-slim.md as a required second output

## Type
feature

## Priority
critical — slim map cannot exist without this generation step.

## Preconditions
- `codemap-agent.md` has been updated to list `dark-factory/code-map-slim.md` as a required output.

## Action
Read `.claude/agents/codemap-agent.md` and inspect its content.

## Expected Outcome
- `codemap-agent.md` lists `dark-factory/code-map-slim.md` explicitly as one of its output files (alongside `dark-factory/code-map.md` and `dark-factory/code-map.mermaid`).
- The "You produce" or equivalent output block shows at least three output files including `code-map-slim.md`.
- The full-scan path (Step 3: Synthesize Code Map) includes an instruction to write `code-map-slim.md`.
- The incremental refresh path also includes an instruction to update `code-map-slim.md` in the same pass.
- `plugins/dark-factory/agents/codemap-agent.md` is identical to `.claude/agents/codemap-agent.md`.

## Notes
Validates FR-5, AC-2, AC-4. Content assertion against the agent definition.

# Scenario: Agent handles missing templates directory gracefully

## Type
edge-case

## Priority
medium — covers EC-1; a target project that has not been initialized would lack the templates directory

## Preconditions
- Agent files reference template paths
- The `dark-factory/templates/` directory does NOT exist (simulating an uninitialized target project)

## Action
Evaluate whether the agent instruction wording handles the case where the template file is not found:
- The reference instruction should be a simple "Read the file at X" -- if the file does not exist, the LLM runtime (Claude Code) will report a file-not-found error
- The agent should have guidance to report this error gracefully rather than producing partial output

## Expected Outcome
- The agent instructions include a note or the phrasing naturally handles the missing-file case (e.g., "Read the template at `dark-factory/templates/spec-template.md` and use it as your output template. If the file does not exist, inform the developer to run the init script.")
- OR the error handling row in the spec ("Template file not found at runtime") maps to agent behavior that reports the error

## Notes
Corresponds to EC-1. This is a runtime behavior concern, not a test assertion.

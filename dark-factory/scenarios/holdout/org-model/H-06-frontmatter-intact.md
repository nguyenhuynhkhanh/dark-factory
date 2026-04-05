# Scenario: Agent frontmatter is not corrupted during template extraction

## Type
edge-case

## Priority
high — corrupted frontmatter would cause agent spawn failures

## Preconditions
- Phase 1 implementation is complete

## Action
Parse the frontmatter of each modified agent file and verify required fields.

## Expected Outcome
- spec-agent.md: `name: spec-agent`, `description` non-empty, `tools` includes Read/Write/Glob/Grep/Bash/Agent/AskUserQuestion
- debug-agent.md: `name: debug-agent`, `description` non-empty, `tools` includes Read/Write/Glob/Grep/Bash/Agent/AskUserQuestion
- onboard-agent.md: `name: onboard-agent`, `description` non-empty, `tools` includes Read/Glob/Grep/Bash/Write/AskUserQuestion
- All frontmatter blocks are properly delimited with `---` markers

## Notes
Existing tests already check frontmatter, but this scenario explicitly validates it was not damaged during extraction.

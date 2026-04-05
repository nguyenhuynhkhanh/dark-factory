# Scenario: onboard-agent.md no longer contains the full inline profile template

## Type
feature

## Priority
high — verifies template removal for onboard-agent specifically

## Preconditions
- Phase 1 implementation is complete

## Action
Read `.claude/agents/onboard-agent.md` and search for distinctive profile template markers:
- `## How This Profile Is Used` with the agent-to-section mapping table
- `## Authentication & Authorization Model` section
- `## Environment & Configuration` section
- `## For New Features` and `## For Bug Fixes` sections
- `## Developer Notes` as the last template section

## Expected Outcome
- The agent file does NOT contain the full project profile template block (the content between ` ```md ` fences under `## Project Profile Template`)
- The agent file DOES contain a reference instruction pointing to `dark-factory/templates/project-profile-template.md`
- The code map template (inside Phase 3.5) is NOT removed in Phase 1 -- it remains in the agent

## Notes
Corresponds to BR-2, FR-1. Important: only the profile template is extracted in Phase 1, not the code map template.

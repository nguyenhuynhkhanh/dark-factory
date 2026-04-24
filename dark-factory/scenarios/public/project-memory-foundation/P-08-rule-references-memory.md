# Scenario: dark-factory-context.md rule references index.md as the always-load memory source

## Type
feature

## Priority
critical — if the rule does not reference the index, no downstream agent will load memory context.

## Preconditions
- `.claude/rules/dark-factory-context.md` exists.

## Action
Read the rule file.

## Expected Outcome
- The file references `dark-factory/memory/index.md` as an always-load context source (not the old monolithic `invariants.md` or `decisions.md` filenames).
- The file does NOT direct agents to load individual shard files (e.g., `invariants-security.md`) — shard loading is consumer-driven, not context-rule-driven.
- The file includes prose stating that a missing index file is non-blocking: agents treat it as "not yet onboarded" — warn and proceed — matching the existing pattern for missing `project-profile.md`.
- The existing three bullets (project-profile, code-map, manifest) are still present and unchanged.
- The file does NOT mention the old filenames `invariants.md` or `decisions.md` as load targets.

## Notes
Validates FR-14, FR-15, DEC-TBD-g. The rule is the entry point for all agents that load project context. Switching from "read each memory file" to "always read index.md only" is the key behavioral change from the original design.

# Scenario: Rule file explicitly documents non-blocking behavior for missing memory index

## Type
failure-recovery

## Priority
critical — backward compatibility for existing Dark Factory projects that have never been onboarded with memory.

## Preconditions
- `.claude/rules/dark-factory-context.md` exists with the memory update applied.

## Action
Read the rule file and scan for prose describing how agents should behave when `dark-factory/memory/index.md` is missing.

## Expected Outcome
- The file contains explicit prose stating that a missing `dark-factory/memory/index.md` is non-blocking.
- The prose uses language such as "warn and proceed", "not yet onboarded", or "treat as empty" — enough that any agent implementer reading this rule will not throw on a missing index.
- The prose uses the SAME pattern as the existing treatment of missing `project-profile.md` (the memory bullet is parallel in structure to the existing three).
- No wording demands index presence as a precondition for `/df-*` commands.
- The rule does NOT instruct agents to fall back to reading individual shard files when the index is missing — the correct fallback is to proceed with no memory context (warn-only).

## Notes
Validates FR-15, BR-5, EC-1, EC-12. This is the migration guarantee for existing projects. The "no shard fallback" clause prevents agents from accidentally loading all shards when the index is absent, which would defeat the token-efficiency design.

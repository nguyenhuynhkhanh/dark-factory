# Scenario: Plugin mirror files are byte-identical to source files

## Type
feature

## Priority
critical -- plugin mirror consistency is a core Dark Factory invariant

## Preconditions
- All four files have been modified:
  - `.claude/agents/onboard-agent.md`
  - `plugins/dark-factory/agents/onboard-agent.md`
  - `dark-factory/templates/project-profile-template.md`
  - `plugins/dark-factory/templates/project-profile-template.md`

## Action
Compare source files to their plugin mirrors.

## Expected Outcome
- `.claude/agents/onboard-agent.md` is byte-identical to `plugins/dark-factory/agents/onboard-agent.md`
- `dark-factory/templates/project-profile-template.md` is byte-identical to `plugins/dark-factory/templates/project-profile-template.md`

## Notes
Validates AC-8 and AC-9. Existing mirror consistency tests already cover this, but it is called out explicitly because this spec touches both pairs.

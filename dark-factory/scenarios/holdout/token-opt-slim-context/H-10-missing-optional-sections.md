# Scenario: onboard-agent omits slim sections that have no content in the full profile

## Type
edge-case

## Priority
medium — writing an empty `## Common Gotchas` section is worse than omitting it. An agent reading the slim file would see an empty section and not know whether it means "no gotchas" or "section extraction failed."

## Preconditions
- `onboard-agent.md` has been updated with the Phase 7.2 slim-generation step.
- Simulate: the full profile has no `## Common Gotchas` section (e.g., a project that the developer explicitly left blank or a greenfield with minimal profile).
- Simulate separately: the full profile has no `## Entry Point Traces` section.

## Action
Read `onboard-agent.md`. Check the Phase 7.2 instructions for how to handle missing source sections.

## Expected Outcome
- The Phase 7.2 instructions state (or clearly imply) that if a source section does not exist in the full profile, the corresponding slim section is omitted — not written as empty.
- There is explicit guidance covering at least Common Gotchas and Entry Points as potentially-absent sections.
- The slim profile's header disclaimer is still written even when some sections are absent.
- The slim profile remains valid markdown with no empty `##` section headings.

## Failure Mode
If the agent writes `## Common Gotchas\n` with nothing after it: consumers reading the slim file see an empty section. A model processing this might interpret it as "no gotchas verified" or "section extraction error" — both are misleading.

## Notes
Validates EC-6, EC-7. Holdout because this tests the handling of an absent source section — something that only matters for atypical projects and is easy to miss during implementation.

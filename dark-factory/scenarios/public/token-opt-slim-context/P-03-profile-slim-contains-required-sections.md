# Scenario: project-profile-slim.md contains required sections in the correct order

## Type
feature

## Priority
critical — a slim file missing its required sections has no value over the full file.

## Preconditions
- `dark-factory/templates/project-profile-slim-template.md` exists and has been written per spec.
- `onboard-agent.md` has been updated with the Phase 7.2 generation step.

## Action
Read `dark-factory/templates/project-profile-slim-template.md`. Also read `onboard-agent.md` and verify the extraction rules it specifies for each section.

## Expected Outcome
- The template file defines exactly these sections in order:
  1. Header disclaimer line: `> Slim profile — generated from project-profile.md. For full context read project-profile.md.`
  2. `## Tech Stack` — extraction rule: rows from full profile Tech Stack table (no prose)
  3. `## Critical Conventions` — extraction rule: 3–5 bullet points from Architecture/Patterns to Follow or Structural Notes
  4. `## Entry Points` — extraction rule: top 2–3 entry points only
  5. `## Common Gotchas` — extraction rule: verbatim copy of Common Gotchas section
- `onboard-agent.md` instructs the agent to extract the above sections using the above rules.
- The template states the target is ~30 lines / ~500 tokens.

## Notes
Validates FR-2, FR-3, FR-4, AC-5, AC-7. Tests the template content and the agent's extraction rules.

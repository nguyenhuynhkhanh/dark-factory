# Scenario: slim files are generated without error for a very small project

## Type
edge-case

## Priority
medium — small projects (< 5 source files) produce very short full files. The slim file should be valid even when there is little to extract.

## Preconditions
- Simulate: `dark-factory/project-profile.md` exists but is very short (~15 lines) — a minimal greenfield profile with Tech Stack table and a short Common Gotchas section, no Architecture section, no Structural Notes.
- Simulate: `dark-factory/code-map.md` exists but contains only `## Module Dependency Graph` with two entries and `## Shared Dependency Hotspots` with an empty table — no other sections because the project has < 5 files.

## Action
Check codemap-agent.md and onboard-agent.md for handling of small-project edge cases in slim generation.

## Expected Outcome
- `codemap-agent.md` does NOT require a minimum size threshold before generating the slim map — it generates slim regardless of project size.
- `onboard-agent.md` does NOT require the full profile to have all four sections before generating the slim profile — missing sections (e.g., no Common Gotchas) are handled gracefully (omit the section, not error).
- The slim profile is still written with the header disclaimer even if it contains only 2 sections.
- The slim map is still written with the header disclaimer and git hash even if it has fewer lines than the 25-line target.

## Failure Mode
If slim generation is gated on a minimum size or requires all sections to exist: small-project users get no slim files, defeating the purpose of the feature for precisely the users who need them least (but who should still get consistent behavior).

## Notes
Validates EC-5, EC-6, EC-7. Holdout because small-project handling is the corner case most likely to be missed in implementation — the happy path is tested on the Dark Factory project itself, which has a full and complete profile.

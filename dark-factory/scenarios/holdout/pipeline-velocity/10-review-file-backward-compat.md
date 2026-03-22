# Scenario: Synthesized review file maintains backward compatibility

## Type
regression

## Priority
critical -- existing orchestration logic reads review files

## Preconditions
- A large-scope feature completed parallel domain review
- Three domain review files exist
- The orchestrator synthesizes them into `test-feature.review.md`

## Action
The existing orchestration review-reading logic (the "check if review already exists" step in df-orchestrate) reads the synthesized review file.

## Expected Outcome
- The synthesized `test-feature.review.md` contains all required sections:
  - `## Architect Review: test-feature`
  - `### Rounds: N`
  - `### Status: APPROVED | APPROVED WITH NOTES | BLOCKED`
  - `### Key Decisions Made` (with items)
  - `### Remaining Notes` (if APPROVED WITH NOTES)
  - `### Blockers` (if BLOCKED)
- The existing logic that checks for APPROVED/BLOCKED status works without modification
- The existing logic that reads cached reviews to skip re-review works without modification
- A review file produced by the OLD pipeline (pre-pipeline-velocity, 3-round sequential) is still readable by the new orchestrator

## Failure Mode (if applicable)
If the synthesized review file changes the section headers or status format, the orchestrator's status-checking logic breaks and may re-run reviews unnecessarily or skip blocked reviews.

## Notes
Backward compatibility here means: the synthesized file format is a superset of the old format. New fields/sections may be added but existing ones must keep the same name and position.

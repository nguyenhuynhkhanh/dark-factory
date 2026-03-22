# Scenario: Cached APPROVED review still forwards findings on re-run

## Type
feature

## Priority
high -- validates that re-runs do not lose architect context

## Preconditions
- A feature spec exists with scope size `medium`
- A previous orchestration run produced `test-feature.review.md` with status APPROVED WITH NOTES
- The review file contains "Key Decisions Made" and "Remaining Notes" sections
- The developer runs orchestration again (e.g., after a test failure)

## Action
Run `/df-orchestrate test-feature` and select "new" or "fix" mode for the re-run.

## Expected Outcome
- The orchestrator detects the existing APPROVED review file
- Architect review is skipped (cached approval)
- The orchestrator still reads the review file and extracts findings
- The findings ("Key Decisions Made" + "Remaining Notes") are forwarded to the code-agent
- Code-agent receives the same architectural context as the first run

## Notes
This ensures that re-running implementation after a failure does not degrade the code-agent's context. The architect's decisions should inform every implementation attempt, not just the first.

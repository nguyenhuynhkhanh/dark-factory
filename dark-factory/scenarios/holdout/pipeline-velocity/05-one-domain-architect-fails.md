# Scenario: One domain architect-agent fails or times out during parallel review

## Type
failure-recovery

## Priority
high -- partial failure in parallel spawning

## Preconditions
- A large-scope feature triggers parallel domain review
- Three architect-agents are spawned in parallel
- The Security domain agent completes successfully (APPROVED)
- The Architecture domain agent completes successfully (APPROVED WITH NOTES)
- The API domain agent fails (times out, crashes, or produces no output)

## Action
The orchestrator waits for all three agents and detects that one failed.

## Expected Outcome
- The orchestrator detects that the API domain review is missing or incomplete
- The orchestrator reports to the developer which domain failed
- The orchestrator offers options:
  1. Retry the failed domain only
  2. Proceed with available reviews (2 of 3 domains)
  3. Abort and investigate
- If the developer chooses to proceed with partial reviews, the synthesized review notes that API domain was not reviewed
- The domain review files for the successful domains are preserved
- No `test-feature.review-api.md` file is created (or it contains an error marker)

## Failure Mode (if applicable)
If the orchestrator waits indefinitely for the failed agent, the pipeline hangs. If it silently proceeds without the failed domain, a critical API concern could be missed.

## Notes
The orchestrator should have a reasonable timeout for parallel agent completion and handle partial results gracefully.

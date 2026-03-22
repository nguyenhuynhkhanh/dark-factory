# Scenario: Round-by-round discussion is stripped from findings forwarded to code-agent

## Type
edge-case

## Priority
critical -- information barrier integrity

## Preconditions
- A medium-scope feature completed architect review
- The review file `test-feature.review.md` contains:
  ```
  ## Architect Review: test-feature
  ### Rounds: 1
  ### Status: APPROVED WITH NOTES

  ### Round 1 Discussion
  The architect noted that the error handling pattern should use the project's
  existing ErrorHandler class. The spec-agent agreed and updated the spec to
  reference ErrorHandler for all new endpoints. The architect also questioned
  whether the retry logic would mask transient failures...

  ### Key Decisions Made
  - Use ErrorHandler class for all new endpoints: consistent with project patterns
  - Add circuit breaker for external API calls: prevents cascade failures

  ### Remaining Notes
  - Consider adding request-id propagation for observability
  ```

## Action
The orchestrator extracts findings and passes them to the code-agent.

## Expected Outcome
- The code-agent receives ONLY:
  - "Key Decisions Made" section content
  - "Remaining Notes" section content
- The code-agent does NOT receive:
  - The "Round 1 Discussion" section
  - Any content from "Rounds" header
  - Any discussion about what the spec-agent did or said
- The forwarded content does not contain phrases like "spec-agent agreed", "architect noted", or any dialogue-style content

## Failure Mode (if applicable)
If round discussion leaks to the code-agent, it could hint at holdout scenario themes (e.g., "the architect questioned whether retry logic would mask transient failures" hints at a failure-recovery holdout scenario).

## Notes
This is the most critical information barrier scenario for this feature. The whitelist-based extraction (only named sections) is the primary defense. The orchestrator should never forward "everything except holdout content" -- it should forward ONLY the whitelisted sections.

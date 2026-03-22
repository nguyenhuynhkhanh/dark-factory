# Scenario: Architect review findings are forwarded to code-agent

## Type
feature

## Priority
critical -- validates the findings forwarding mechanism

## Preconditions
- A feature spec exists with scope size `medium`
- Architect review has completed with APPROVED WITH NOTES status
- The review file `test-feature.review.md` contains:
  - A "Key Decisions Made" section with 3 decisions
  - A "Remaining Notes" section with 2 notes
  - A "Rounds" section with discussion content (should NOT be forwarded)

## Action
The orchestrator proceeds to spawn code-agents after review approval.

## Expected Outcome
- The orchestrator reads `test-feature.review.md`
- Only the "Key Decisions Made" and "Remaining Notes" sections are extracted
- The round-by-round discussion content is stripped
- The code-agent is spawned with three inputs:
  1. The spec file content
  2. The public scenario files content
  3. The architect review findings (Key Decisions + Remaining Notes only)
- The code-agent treats the findings as architectural constraints
- The code-agent's implementation reflects the key decisions (e.g., if a decision says "use event-driven pattern for X", the implementation uses events)

## Failure Mode (if applicable)
If the review file cannot be parsed, the orchestrator should log a warning and proceed without findings (degraded but not blocked).

## Notes
The findings extraction is whitelist-based: only named sections are forwarded. This is defense-in-depth for the information barrier.

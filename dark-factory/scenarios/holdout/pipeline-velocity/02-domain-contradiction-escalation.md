# Scenario: Contradictory domain recommendations escalate to developer

## Type
edge-case

## Priority
high -- validates contradiction handling which could silently drop expert recommendations

## Preconditions
- A large-scope feature is in parallel domain review
- Security domain review says: "APPROVED WITH NOTES -- encrypt the `userToken` field at rest"
- Architecture domain review says: "APPROVED WITH NOTES -- keep the schema simple, avoid field-level encryption as it complicates queries"
- API domain review says: APPROVED

## Action
All three domain reviews complete and the orchestrator synthesizes results.

## Expected Outcome
- The orchestrator detects a contradiction between Security and Architecture domains regarding field encryption
- Neither domain is BLOCKED, so this is not a simple strictest-wins case
- The orchestrator does NOT silently pick one recommendation over the other
- The orchestrator presents BOTH positions to the developer and waits for a decision
- The synthesized review file notes the contradiction and the developer's resolution
- Implementation does not proceed until the contradiction is resolved

## Failure Mode (if applicable)
If the orchestrator simply merges all notes without detecting contradictions, the code-agent receives conflicting architectural constraints and must guess which to follow.

## Notes
Contradiction detection should be based on the orchestrator reading the findings and identifying conflicting recommendations about the same aspect of the system. This is a judgment call by the orchestrator, not a mechanical check.

# Scenario: implementation-agent Hard-Fail — architectReviewedAt Present but Null

## Type
edge-case

## Priority
high — a null value must be treated identically to an absent key; implementations might check only for key existence

## Preconditions
- `dark-factory/manifest.json` contains an entry for `null-review-spec` with `architectReviewedAt` explicitly set to `null`:
  ```json
  "null-review-spec": {
    "type": "feature",
    "status": "active",
    "specPath": "dark-factory/specs/features/null-review-spec.spec.md",
    "created": "2026-04-30T00:00:00Z",
    "rounds": 0,
    "group": null,
    "dependencies": [],
    "architectReviewedAt": null,
    "findingsPath": null,
    "architectReviewedCodeHash": null
  }
  ```
- df-orchestrate spawns implementation-agent for `null-review-spec`

## Action
implementation-agent starts, reads the manifest entry. `architectReviewedAt` key is present but its value is `null`.

## Expected Outcome

### Hard-fail triggered
- implementation-agent treats `null` as equivalent to absent
- Emits the exact prescribed message:
  > "Spec null-review-spec has no architect review record. This spec was likely created before token-opt-architect-phase shipped. Re-run /df-intake null-review-spec to complete architect review, then retry."
- STOPS immediately — does not proceed to pre-flight test gate

### Structured result
- Emits `{ "specName": "null-review-spec", "status": "blocked", "error": "..." }`

### What does NOT happen
- No architect-agent spawn
- No code-agent spawn
- No attempt to use `findingsPath: null` as a path

## Notes
The implementation must check for both key absence AND null value. A check of `manifest.architectReviewedAt !== undefined` would pass this but a check of `manifest.architectReviewedAt` as a truthy value would also pass. The implementation should use: `if (!entry.architectReviewedAt)` or equivalent that treats null, undefined, and empty string all as absent.

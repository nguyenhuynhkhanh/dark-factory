# Scenario: implementation-agent Hard-Fail When architectReviewedAt Absent

## Type
feature

## Priority
critical — the hard-fail is the enforcement mechanism for the Gate 1 migration contract

## Preconditions
- `dark-factory/manifest.json` contains an entry for `legacy-spec` that is MISSING the `architectReviewedAt` field:
  ```json
  "legacy-spec": {
    "type": "feature",
    "status": "active",
    "specPath": "dark-factory/specs/features/legacy-spec.spec.md",
    "created": "2026-04-01T00:00:00Z",
    "rounds": 0,
    "group": null,
    "dependencies": []
  }
  ```
- `dark-factory/specs/features/legacy-spec.spec.md` exists
- `dark-factory/project-profile.md` exists with a valid test command
- df-orchestrate spawns implementation-agent for `legacy-spec`

## Action
implementation-agent starts. It reads the manifest entry for `legacy-spec`. It finds the `architectReviewedAt` field is absent (key does not exist in the JSON object).

## Expected Outcome

### Hard-fail with exact message
- implementation-agent stops immediately — does NOT proceed to pre-flight test gate
- implementation-agent emits the exact message:
  > "Spec legacy-spec has no architect review record. This spec was likely created before token-opt-architect-phase shipped. Re-run /df-intake legacy-spec to complete architect review, then retry."
- The `{name}` placeholder in the message is substituted with the actual spec name (`legacy-spec`)

### No architect spawn
- implementation-agent does NOT spawn any architect-agent
- No `{name}.review.md` is written
- No attempt is made to run Gate 1 as a fallback

### Structured result emitted
- implementation-agent emits the structured JSON result with status `"blocked"`:
  ```json
  {
    "specName": "legacy-spec",
    "status": "blocked",
    "error": "Spec legacy-spec has no architect review record. ..."
  }
  ```

### What does NOT happen
- No code-agent is spawned
- Pre-flight test gate does NOT run
- `architectFindingsPath` is NOT set from an assumed default path

## Notes
This scenario maps to AC-8, FR-7, BR-1, BR-3.
The exact message text matters because `tests/dark-factory-setup.test.js` will assert on it by string match. The message must include "no architect review record" and "Re-run /df-intake {name}".
Testing both the absent key and a `null` value for `architectReviewedAt` is covered in holdout scenario H-01.

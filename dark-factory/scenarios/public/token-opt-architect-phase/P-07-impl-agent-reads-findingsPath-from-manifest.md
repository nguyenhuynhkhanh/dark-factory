# Scenario: implementation-agent Reads findingsPath from Manifest and Passes to Code-Agent

## Type
feature

## Priority
critical — this is the primary data flow replacing old Step 0d

## Preconditions
- `dark-factory/manifest.json` contains an entry for `approved-spec` WITH all three new fields:
  ```json
  "approved-spec": {
    "type": "feature",
    "status": "active",
    "specPath": "dark-factory/specs/features/approved-spec.spec.md",
    "created": "2026-04-30T10:00:00Z",
    "rounds": 0,
    "group": null,
    "dependencies": [],
    "architectReviewedAt": "2026-04-30T10:05:00Z",
    "findingsPath": "dark-factory/specs/features/approved-spec.findings.md",
    "architectReviewedCodeHash": "abc1234def5678901234567890abcdef12345678"
  }
  ```
- `dark-factory/specs/features/approved-spec.findings.md` exists on disk
- `dark-factory/project-profile.md` exists with a valid `Run:` test command
- df-orchestrate checks `architectReviewedCodeHash` against HEAD — they match (no staleness)
- df-orchestrate spawns implementation-agent

## Action
implementation-agent processes `approved-spec`.

## Expected Outcome

### `architectReviewedAt` check passes
- implementation-agent reads manifest entry, finds `architectReviewedAt` is present
- Proceeds past the hard-fail guard

### `architectFindingsPath` set from manifest
- implementation-agent sets `architectFindingsPath` to the value of `findingsPath` from manifest: `"dark-factory/specs/features/approved-spec.findings.md"`
- This is NOT derived from a naming convention — it is READ directly from `findingsPath`

### No architect spawn
- implementation-agent does NOT spawn any architect-agent (Steps 0a/0c/0d are absent)
- No `{name}.review.md` is written or read
- Pre-flight test gate runs directly after the `architectReviewedAt` check

### `architectFindingsPath` passed to code-agent
- When implementation-agent spawns code-agent in Step 1, it passes `architectFindingsPath` as an explicit path parameter
- code-agent self-loads findings at startup from that path

### Compiled token count
- Compiled `implementation-agent.md` token count is ≤ 3,200 tokens
- (Removing Steps 0a/0c/0d should reduce total size, not increase it)

## Notes
This scenario maps to AC-8, AC-9, AC-11, FR-7, FR-8.
The key change from before: `architectFindingsPath` is read from `manifest.findingsPath`, not written by implementation-agent at runtime. implementation-agent is now a consumer of findings, not a producer.

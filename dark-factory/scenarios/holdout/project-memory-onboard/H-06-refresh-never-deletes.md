# Scenario: H-06 — Incremental refresh never deletes from any shard; status flip only; index regenerated

## Type
edge-case

## Priority
critical — FR-20, FR-19, BR-7. A delete-on-refresh bug would destroy accumulated memory silently.

## Preconditions
- onboard-agent file has incremental-refresh section documented.

## Action
Structural test asserts the incremental-refresh section:
1. Explicitly uses the phrase `status flip` (or close equivalent like `flip status`, `status: retired`) at least once.
2. Does NOT contain any phrase permitting deletion of existing entries from any shard file (no `delete entry`, `remove from registry`, `drop entry` in the context of refresh).
3. Documents the status values a stale entry can transition to: at minimum `retired`, with fields `retiredAt: <ISO>` and `retiredReason`.
4. States that even when the developer explicitly requests removal, the agent performs a status flip in the shard file — it never unwrites shard file content.
5. After sign-off, the index is fully regenerated from scratch by scanning all shards — the refresh documentation must not describe appending to or partially updating the existing index.

## Expected Outcome
- `status flip` documented.
- No deletion phrasing in refresh context for shard files.
- Retirement schema documented.
- Even developer-confirmed removal is a status flip in the shard file.
- Index regeneration from scratch (not append) is documented for the refresh path.

## Failure Mode (if applicable)
If any deletion phrase appears in the refresh context, test prints it. If the retirement schema is not documented, test names the missing fields. If the index is described as being appended to or partially updated rather than regenerated, test flags it.

## Notes
This protects against a subtle bug class where the agent might "tidy up" by removing entries the developer flagged as irrelevant. The entry history in shards must remain auditable. The index is a projection — regenerating it from scratch on each refresh is safe and ensures it never gets out of sync with the shard files.

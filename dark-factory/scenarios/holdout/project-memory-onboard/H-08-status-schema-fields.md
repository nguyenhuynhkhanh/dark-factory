# Scenario: H-08 — Retired-entry schema completeness; tags and shard fields documented

## Type
edge-case

## Priority
medium — FR-20, FR-17, FR-23. If the retired-entry schema or the tags/shard fields are ambiguous, downstream consumers will parse entries inconsistently.

## Preconditions
- onboard-agent file documents the status-flip mechanism and the sign-off UX.

## Action
Structural test asserts two things:

**Status-flip schema (FR-20):**
The status-flip documentation specifies at least these fields:
- `status` (values: at minimum `active`, `retired`)
- `retiredAt` (ISO-8601)
- `retiredReason` (string — may be free-form or developer-provided)

And that the retired entry's original content (`id`, `title`, `rule`, `sourceRef`, etc.) is **preserved** — not overwritten — when the status flip is applied.

**Tags and shard fields (FR-17, FR-23):**
The sign-off or write documentation specifies:
- `tags` field: optional, max 5 lowercase keywords; proposed by onboard-agent, editable by developer
- `shard` field: required on every written entry; computed by onboard-agent as the destination shard filename; never computed by consumers
- Both fields appear on the written shard entry, not only in the index row

## Expected Outcome
- Status values enumerated (`active`, `retired`).
- Retirement metadata fields named (`retiredAt`, `retiredReason`).
- Original content preservation is explicit.
- `tags` field constraints (max 5, lowercase, free-form) documented.
- `shard` field described as onboard-agent-computed, not developer-provided.

## Failure Mode (if applicable)
If any status-flip field is missing from the documentation, test names it. If `tags` or `shard` field constraints are absent, test names them. If preservation is ambiguous, test fails.

## Notes
Consumers reading shard files need to know whether a retired entry retains its original `rule` text. This scenario locks that in. The `tags` and `shard` fields are new additions from the shard-aware design; they must be documented in the write protocol alongside the existing status-flip schema.

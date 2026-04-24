# Scenario: H-NEW-03 — Developer edits candidate domain during sign-off; entry routed to updated domain shard

## Type
edge-case

## Priority
high — FR-23, EC-20, BR-14. Domain rerouting on edit must be applied at write time, not at display time, to avoid double-rendering confusion.

## Preconditions
- Phase 7 Memory Sign-Off documents per-entry edit semantics including domain editing.

## Action
Structural test asserts the sign-off documentation:
1. Explicitly states that developers can edit a candidate's `domain` field during per-entry sign-off (in addition to editing `title`, `rule`, `tags`, and `sourceRef`).
2. When a candidate's `domain` is edited (e.g., changed from `security` to `api`), the agent routes the write to the updated domain's shard file (`invariants-api.md` in this example), not the original domain's shard.
3. The `shard` field on the written entry reflects the UPDATED domain's shard filename — not the shard that was originally proposed.
4. The index row for the entry reflects the UPDATED domain and updated shard filename.
5. The documentation states that domain rerouting is applied at write time only — the sign-off display is not re-rendered after a domain edit (BR-14).

## Expected Outcome
- Domain field is explicitly listed as an editable field during per-entry sign-off.
- Rerouting behavior on domain edit is documented (updated domain → updated shard).
- `shard` field on written entry reflects updated domain.
- Index row reflects updated domain and shard.
- Write-time-only rerouting (no mid-sign-off re-render) is documented.

## Failure Mode (if applicable)
If domain is not listed as an editable field, test flags it. If the rerouting documentation is absent or describes static routing regardless of edits, test fails. If the index is described as showing the original domain rather than the updated one, test flags it.

## Notes
This scenario addresses a subtle UX trap: the candidate is displayed with `domain: security` during sign-off; the developer edits it to `domain: api`; the agent must not write to `invariants-security.md`. The write-time routing table lookup must use the candidate's current (post-edit) domain value, not the value at display time. This is the BR-14 "write-time only" rule.

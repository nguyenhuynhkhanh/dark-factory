# Scenario: P-NEW-03 — Sign-off flow displays tags proposal per entry; developer can accept, edit, or clear

## Type
feature

## Priority
high — FR-23, AC-6. Tags are a new field in the sign-off UX; if undocumented, the code-agent will omit the tags proposal entirely.

## Preconditions
- Phase 7 Memory Sign-Off section documents per-entry sign-off UX.

## Action
Structural test asserts the Phase 7 Memory Sign-Off documentation:
1. States that onboard-agent proposes `tags` for each invariant and decision candidate during sign-off (not for ledger entries, which are read-only).
2. The proposed tags are displayed alongside the candidate's domain, title, and rule.
3. The developer has three tag actions: accept proposed tags, edit tags (add/remove/change keywords), or clear tags (resulting in an empty tag list).
4. Tags are described as: free-form lowercase keywords, maximum 5 per entry.
5. If developer edits a candidate's `domain` during sign-off, the `tags` proposal is NOT invalidated — the edited domain changes the shard routing but the developer retains the same tag choices.
6. Tags are written to the shard entry as a field (e.g., `tags: [auth, schema]` or `tags: []` for empty).
7. Tags also appear in the corresponding index row (`[tags:auth,schema]` or `[tags:]`).

## Expected Outcome
- Tags proposal per entry documented.
- Three developer tag actions documented (accept / edit / clear).
- Tags constraints (lowercase, max 5, free-form) documented.
- Tags written to shard entry documented.
- Tags in index row format documented.
- Tags/domain independence on domain edit documented.

## Failure Mode (if applicable)
If the tags proposal is absent from sign-off documentation, test names it. If the developer has fewer than three actions (e.g., only accept or reject), test flags it. If tags constraints are absent, test flags them.

## Notes
This scenario is the public anchor for the tags sign-off feature. The code-agent must implement the full three-action UX (accept/edit/clear) to pass this scenario. The independence of tags from domain edits is important because a developer might legitimately change `domain: security` to `domain: architecture` while keeping their `tags: [auth]` choice — revoking the tags on domain edit would be a UX regression.

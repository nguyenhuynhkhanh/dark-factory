# Scenario: P-NEW-01 — Accepted invariant is written to the correct domain shard file

## Type
feature

## Priority
critical — FR-17, AC-15. Shard routing is the core architectural change in this spec; if routing is undocumented, the entire shard layout has no behavioral anchor.

## Preconditions
- Phase 3.7 or Phase 7 Memory Sign-Off documents the shard routing table.
- Bootstrap Write Exception section references the six shard files.

## Action
Structural test asserts:
1. A shard routing table (or equivalent enumeration) exists in the agent file mapping domain values to shard filenames for invariants:
   - `security` → `invariants-security.md`
   - `architecture` → `invariants-architecture.md`
   - `api` → `invariants-api.md`
2. An equivalent routing table exists for decisions:
   - `security` → `decisions-security.md`
   - `architecture` → `decisions-architecture.md`
   - `api` → `decisions-api.md`
3. The `shard` field is documented as being set on each written entry to the destination shard filename.
4. No reference to `invariants.md` or `decisions.md` as write targets (legacy monolithic file names are absent from the write protocol).

## Expected Outcome
- Both routing tables present (invariants + decisions).
- All six domain→shard mappings explicit.
- `shard` field assignment documented.
- No legacy monolithic file names as write targets.

## Failure Mode (if applicable)
If either routing table is missing, test names it. If any domain→shard mapping is incorrect or absent, test names the gap. If `invariants.md` or `decisions.md` appear as write targets, test flags them.

## Notes
This is the public counterpart to H-NEW-01 (holdout). The code-agent must implement the shard routing correctly — this scenario ensures the routing is documented in the agent file so the code-agent has a concrete specification to implement from. The absence of `invariants.md` / `decisions.md` as write targets is equally important — it confirms the breaking change is intentional and documented.

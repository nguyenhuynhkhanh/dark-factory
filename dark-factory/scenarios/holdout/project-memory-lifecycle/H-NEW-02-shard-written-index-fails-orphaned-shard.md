# Scenario: promote-agent writes shard, index update fails → ORPHANED_SHARD detected by df-cleanup

## Type
failure-recovery

## Priority
critical — ORPHANED_SHARD is the chosen partial-failure state; it must be detectable and repairable.

## Preconditions
- promote-agent.md edited per shard-first, index-last protocol.
- Spec introduces one invariant with `domain: security`, being assigned INV-0010.
- `dark-factory/memory/invariants-security.md` write succeeds: `## INV-0010` heading is appended.
- `dark-factory/memory/index.md` update fails (simulated write error after shard write succeeded).
- Promotion has failed and manifest is at `passed`.

## Action (two-part)

**Part 1: promote-agent behavior on failure.**
promote-agent shard write to `invariants-security.md` succeeds. The subsequent index update to `index.md` fails.

**Part 2: df-cleanup detection.**
Developer runs `/df-cleanup` on the repository in this state.

## Expected Outcome

**Part 1:**
- promote-agent does NOT attempt to delete INV-0010 from `invariants-security.md` (destructive — rejected per DEC-TBD-c).
- promote-agent logs: "ORPHANED_SHARD: INV-0010 written to invariants-security.md but index update failed. Run `--rebuild-index` to repair."
- promote-agent reports failure to implementation-agent: "Memory write partially complete — ORPHANED_SHARD condition. Promotion aborted. Run `--rebuild-index` before retrying."
- Manifest stays at `passed`.

**Part 2:**
- df-cleanup's Memory Health Check scans `invariants-security.md` and finds `## INV-0010`.
- df-cleanup checks `index.md` — no row for INV-0010.
- df-cleanup reports: "ORPHANED_SHARD: INV-0010 found in invariants-security.md but missing from index.md. Run `--rebuild-index` to repair." Severity: WARNING.
- df-cleanup does NOT auto-fix; does NOT delete the shard entry; does NOT update the index.

## Recovery Outcome (after developer runs `--rebuild-index`)
- `index.md` is regenerated from all shards, including the INV-0010 entry.
- INV-0010 is now properly indexed.
- Developer can retry promotion (which will re-read the index, see INV-0010 already exists, and not duplicate it — or the promotion was for a different spec which assigns the next ID after 0010).

## Notes
Covers NFR-1, BR-15, BR-16, EC-24, EC-28, FR-28. This is the core ORPHANED_SHARD lifecycle scenario — from promote-agent failure through df-cleanup detection to recovery. The shard entry is always preserved over the index entry because shard is ground truth (BR-16).

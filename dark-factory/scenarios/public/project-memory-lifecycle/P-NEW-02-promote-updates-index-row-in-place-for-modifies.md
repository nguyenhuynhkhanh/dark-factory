# Scenario: promote-agent updates the index row in place for Modifies entries

## Type
feature

## Priority
high — Modifies must update (not append) the existing index row.

## Preconditions
- `.claude/agents/promote-agent.md` edited per this spec.
- `dark-factory/memory/index.md` contains a row for INV-0003:
  ```
  ## INV-0003 [type:invariant] [domain:architecture] [tags:spec] [status:active] [shard:invariants-architecture.md]
  Every spec must declare the invariants it touches
  ```
- A spec declares `## Invariants > Modifies > INV-0003` with a new `rule` and `domain: architecture` (unchanged).

## Action
Read promote-agent.md's Modifies-handler documentation.

## Expected Outcome
- promote-agent documents that for a Modifies operation, the existing index row for INV-0003 is UPDATED IN PLACE — not a new row appended.
- The update to the index row reflects any status or metadata changes (e.g., `lastUpdated` if tracked in brackets).
- After promotion, `index.md` still has exactly ONE row for INV-0003 (not two — the old row is not left behind).
- The index row update happens AFTER the shard file update (shard-first ordering).
- The index `entryCount` does NOT increase (Modifies does not add a new entry; it updates an existing one).

## Notes
Covers FR-4, EC-3. Distinguishes the Modifies case (in-place index row update) from the Introduces case (new index row appended). A naive implementation might append a second row for INV-0003, leading to duplicate index entries. The test assertion checks that promote-agent.md contains language distinguishing "update in place" from "append new row" for Modifies vs. Introduces.

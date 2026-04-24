# Scenario: Architect domain-reviewer loads index then only its own domain shards

## Type
feature

## Priority
critical — validates the shard-selective loading rule for architect-agent; this is the highest-value case

## Preconditions
- `dark-factory/memory/index.md` exists
- `dark-factory/memory/invariants-architecture.md` contains `INV-0004` (active, domain: architecture)
- `dark-factory/memory/decisions-architecture.md` contains `DEC-0002` (active, domain: architecture)
- `dark-factory/memory/invariants-security.md` exists (populated with security entries)
- `dark-factory/memory/invariants-api.md` exists (populated with api entries)
- An architecture-domain architect-agent is spawned with `domain: architecture`

## Action
Inspect the architect-agent prompt `.claude/agents/architect-agent.md` for the Domain Parameter / Step 1 memory load instructions. The prompt MUST direct the architecture-domain reviewer to:
1. Read `dark-factory/memory/index.md`.
2. Load ONLY `dark-factory/memory/invariants-architecture.md` + `dark-factory/memory/decisions-architecture.md`.
3. NOT load security or api shards.
4. Perform the invariant/decision probe against architecture-domain entries.
5. Emit `### Memory Findings (Architecture)` in the domain review file.

## Expected Outcome
- The architect-agent prompt contains explicit shard-selection language for the architecture domain: load `invariants-architecture.md` and `decisions-architecture.md`.
- The prompt explicitly states that other-domain shards (security, api) MUST NOT be loaded.
- The prompt generalizes: the shard selection pattern applies to all three domain parameters — security reviewer loads security shards, architecture reviewer loads architecture shards, api reviewer loads api shards.
- The architecture review file contains `### Memory Findings (Architecture)` discussing `INV-0004` and `DEC-0002`.
- The review file does NOT contain findings about security-domain or api-domain entries in the Memory Findings block.
- Total memory reads for the architecture reviewer: 1 index + 2 architecture shards. Bounded to ≤ 4,000 + 2 × 8,000 = 20,000 tokens from memory (NFR-4 compliant).
- The plugin mirror `plugins/dark-factory/agents/architect-agent.md` contains byte-identical content.

## Notes
Validates FR-6, AC-4, AC-5, BR-9, INV-TBD-c, DEC-TBD-a, NFR-4. The architect-agent is the highest-value consumer of shard-selective loading because it is spawned 3× in parallel (once per domain). Each reviewer loading only 2 shards instead of 6 saves 4 × 8,000 = 32,000 tokens across the full architect review round. This is where the index-first protocol pays off most.

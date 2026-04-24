---
version: 1
lastUpdated: 2026-04-24
generatedBy: bootstrap
gitHash: TBD
entryCount: 0
shardCount: 0
---

# Project Memory Index

Always-loaded compact index of all project memory entries. Each entry is one heading row with inline metadata. Agents load only this file from the context rule; each consumer agent's own instructions specify which domain shards to load.

Soft token budget: approximately 4,000 tokens at steady state. Each domain shard has a soft budget of approximately 8,000 tokens. Exceeding either limit is a signal to split the shard.

Schema reference: `dark-factory/templates/project-memory-template.md`

Domain shard files (loaded on demand by consumer agents):
- `invariants-security.md` — security domain invariants
- `invariants-architecture.md` — architecture domain invariants
- `invariants-api.md` — api domain invariants
- `decisions-security.md` — security domain decisions
- `decisions-architecture.md` — architecture domain decisions
- `decisions-api.md` — api domain decisions
- `ledger.md` — append-only feature promotion ledger

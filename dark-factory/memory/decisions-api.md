---
version: 1
lastUpdated: 2026-04-24
generatedBy: bootstrap
gitHash: TBD
---

# Decisions — API Domain

This shard stores architectural decisions classified under the `api` domain. Entries are written by promote-agent at promotion time (once `project-memory-lifecycle` ships) or by onboard-agent during initial extraction.

**Per-shard soft token budget**: this shard SHOULD NOT exceed approximately 8,000 tokens at steady state. Exceeding this limit is a signal that the shard should be split (e.g., `decisions-api-2026.md`).

**Do not add entries by hand.** Declare decisions in a spec's `## Decisions` section using `DEC-TBD-*` placeholders. promote-agent assigns permanent IDs at promotion time and appends entries to this file.

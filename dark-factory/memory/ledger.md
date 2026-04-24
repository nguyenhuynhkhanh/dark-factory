---
version: 1
lastUpdated: 2026-04-24
generatedBy: bootstrap
gitHash: TBD
---

# Feature Ledger

**APPEND-ONLY — do not edit existing entries.** This file is a permanent record of every feature and bugfix promoted through the Dark Factory pipeline. Entries are written once by promote-agent at promotion time and are never modified. Frontmatter (`lastUpdated`, `gitHash`) is updated by promote-agent each time a new entry is appended.

**Single-writer**: only promote-agent writes ledger entries (once `project-memory-lifecycle` ships).

Each entry captures what was shipped, which invariants and decisions were introduced, and which tests were promoted to the permanent suite.

Ledger entries use the format:
```
## FEAT-NNNN: <spec-name>

- **id**: FEAT-NNNN
- **name**: <spec name>
- **summary**: <what was shipped>
- **promotedAt**: <ISO datetime>
- **introducedInvariants**: [INV-NNNN, ...]
- **introducedDecisions**: [DEC-NNNN, ...]
- **promotedTests**: [<test file path>, ...]
- **gitSha**: <cleanup commit SHA>
```

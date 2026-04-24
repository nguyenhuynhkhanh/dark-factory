# Scenario: All consumers gracefully degrade when memory directory or index is missing

## Type
feature

## Priority
critical — decouples foundation rollout from consumer rollout

## Preconditions
- `dark-factory/memory/` directory does NOT exist (fresh project, or pre-foundation deployment)
- `dark-factory/project-profile.md` exists
- `dark-factory/code-map.md` exists
- A feature spec pipeline is triggered end-to-end

## Action
Spawn each consumer agent in turn on the same project:
1. spec-agent for a new feature
2. architect-agent (with domain parameter) for the produced spec
3. code-agent for implementation
4. debug-agent for an unrelated bug (parallel pipeline)

## Expected Outcome
- **spec-agent**: logs `"Memory registry not found at dark-factory/memory/ — proceeding with empty set"`, produces a valid spec with `## Invariants` and `## Decisions` sections populated with "None —" prose. Does NOT crash or block.
- **architect-agent (per-domain)**: each domain reviewer attempts to load index and its domain shards; all are missing; emits in its domain review file: `Memory probe skipped — registry missing.` No BLOCKER is issued on memory grounds. Review Status can still be APPROVED.
- **code-agent**: logs the same registry-missing warning, implements normally, treats constraint set as empty. Does NOT crash.
- **debug-agent**: logs the warning, produces a debug report with no invariant cross-reference. Does NOT crash.
- The entire pipeline completes without any memory-related blocker.
- No consumer references the old monolithic file paths (`dark-factory/memory/invariants.md`, `dark-factory/memory/decisions.md`) in any warning or log — only the index and shard paths are referenced.

## Notes
Validates FR-17, FR-19, FR-21, EC-1 (degenerate case), and INV-TBD-a. This is the critical decoupling guarantee: consumer rollout can ship BEFORE foundation rollout lands the directory, and nothing breaks. The P-NEW-03 scenario covers the sub-case where the index is specifically absent but some shard files exist.

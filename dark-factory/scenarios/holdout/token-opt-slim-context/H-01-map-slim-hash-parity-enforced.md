# Scenario: code-map-slim.md git hash must match code-map.md — parity is non-negotiable

## Type
edge-case

## Priority
critical — if the hashes diverge, the slim map is invisible to freshness checks. Existing skills (df-intake, df-debug, df-orchestrate) compare the stored hash in code-map.md against HEAD; a slim file with a different hash would silently pass freshness checks while pointing to stale data.

## Preconditions
- Both `dark-factory/code-map.md` and `dark-factory/code-map-slim.md` exist and were written in the same codemap-agent run.
- Simulate a scenario where the codemap-agent wrote code-map.md with hash `abc123` but an incorrect implementation wrote code-map-slim.md with a different hash (e.g., the hash of the slim file's own content rather than the current HEAD).

## Action
1. Read `dark-factory/code-map.md`. Extract the `Git hash:` value.
2. Read `dark-factory/code-map-slim.md`. Extract the `Git hash:` value.
3. Assert both hash values are identical strings.
4. Additionally: read `.claude/agents/codemap-agent.md` and assert it contains language specifying that the slim map's git hash is COPIED from (or identical to) the full map's git hash — not independently computed.

## Expected Outcome
- Both `Git hash:` values are identical.
- `codemap-agent.md` contains language such as "same `Git hash:` as `code-map.md`" or "copy the git hash header from the full map."
- There is NO instruction in codemap-agent that would cause a slim file to compute a separate hash.

## Failure Mode
If the hashes diverge: the freshness protocol is broken. Downstream skills treat the slim file as fresh when it is actually stale (or vice versa). This is a silent correctness bug, not a crash.

## Notes
Validates FR-8, BR-3, EC-10. This scenario is holdout because an implementer who reads FR-8 might implement "write the current HEAD hash into the slim file" as an independent operation — which would be correct under normal conditions but could drift if the two writes do not happen atomically. The test here forces verification that the codemap-agent instruction specifies copying the hash, not recomputing it.

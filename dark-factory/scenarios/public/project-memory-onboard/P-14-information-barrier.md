# Scenario: P-14 — Information barrier: onboard-agent writes only to permitted paths (shards + index)

## Type
feature

## Priority
critical — FR-22. Violating this would blur agent responsibilities and break test-harness assumptions.

## Preconditions
- onboard-agent file has been updated.

## Action
Structural test asserts:
1. The agent file's Constraints section (or equivalent) lists the full set of writeable paths for onboard-agent:
   - `dark-factory/project-profile.md`
   - `.claude/settings.json`
   - git hook files (`.git/hooks/pre-commit`, `.husky/pre-commit`, `lefthook.yml`, `package.json`'s `simple-git-hooks` block)
   - `dark-factory/memory/invariants-security.md`
   - `dark-factory/memory/invariants-architecture.md`
   - `dark-factory/memory/invariants-api.md`
   - `dark-factory/memory/decisions-security.md`
   - `dark-factory/memory/decisions-architecture.md`
   - `dark-factory/memory/decisions-api.md`
   - `dark-factory/memory/ledger.md`
   - `dark-factory/memory/index.md`
2. The agent file explicitly states the agent MUST NOT write to any of:
   - `dark-factory/specs/*`
   - `dark-factory/scenarios/*`
   - `dark-factory/promoted-tests.json`
   - source code files
   - test files (other than via the documented test-assertion additions during implementation, which are done BY the code-agent, not onboard-agent at runtime)
3. The existing constraint statement (`NEVER modify source code — you are a reader, not a writer`) is preserved.
4. No reference to the monolithic `invariants.md` or `decisions.md` as writeable targets — those files do not exist in the new layout.
5. The `tags` field is mentioned in the sign-off phase documentation as a field onboard-agent proposes and may write to shard entries.

## Expected Outcome
- Writeable path list contains all eleven entries (profile, settings, git hooks, six shards, ledger.md, index.md).
- Prohibited-write list is explicit.
- Existing "reader, not a writer" constraint preserved for non-listed paths.
- No monolithic `invariants.md` / `decisions.md` referenced as write targets.
- `tags` field mentioned in sign-off documentation.

## Failure Mode (if applicable)
If any writeable path is missing from the list, test names it. If a prohibited path is not called out, test names it. If `invariants.md` or `decisions.md` appears as a write target (legacy reference), test flags it. If the "reader, not a writer" constraint is removed or reworded weakly, test flags it.

## Notes
This scenario cross-checks that Phase 3.7 did not accidentally expand onboard-agent's writing scope. Must pass both before AND after Phase 3.7 is added. The shift from three monolithic files to eight shard+index files is a breaking layout change — the constraint list must reflect the new layout with no legacy references.

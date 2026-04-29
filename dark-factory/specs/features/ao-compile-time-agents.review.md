## Architect Review: ao-compile-time-agents

### Rounds: 1 (Tier 3 — 3 domain agents, Round 1 synthesis)

### Status: APPROVED WITH NOTES

### Key Decisions Made

1. **parseFrontmatter must be updated in both test files**: The existing test helper `parseFrontmatter()` uses `content.match(/^---\n([\s\S]*?)\n---/)` which anchors to the very start of the string. When the auto-generated header comment `<!-- AUTO-GENERATED ... -->` is prepended as the first line, this regex returns null — causing ALL 9 × 3 = 27 agent frontmatter tests to fail. The code-agent MUST update `parseFrontmatter()` in both `tests/dark-factory-setup.test.js` and `tests/dark-factory-contracts.test.js` to handle files that begin with an HTML comment. A simple fix: strip any `<!-- ... -->` prefix before matching, or update the regex to allow optional leading HTML comments. This is the single most critical implementation detail.

2. **Token cap awareness**: Three agents already exceed their token caps before this feature (onboard-agent 6421 vs 5500, spec-agent 5805 vs 5500, architect-agent 5236 vs 5000). The build adds a header comment (~12-15 tokens) and normalizes drifted copies. The implementation must not worsen the token cap failures beyond the pre-existing baseline. The header comment should be compact and all agent content must otherwise be verbatim copies of existing content.

3. **Contracts test approach**: The spec recommends either (a) building to a temp dir with `--output-dir` flag or (b) reimplementing include resolution in-test. Approach (a) is architecturally cleaner and avoids test-vs-build divergence. Support `--output-dir` in `bin/build-agents.js` for the contracts test.

4. **Circular include chain detection**: Must track the full visitation stack (A→B→C→A), not just immediate parent. Pass `visitedStack` recursively as documented in Implementation Notes.

5. **Dual-write to both TARGETS per agent**: Each assembly pass must write to both `.claude/agents/{name}.md` AND `plugins/dark-factory/agents/{name}.md` from the same resolved content string — not sequentially read-then-write from one target to the other. This preserves the mirror parity contract enforced by contracts tests.

6. **Architect-agent context-loading placement**: The architect-agent has a tier-conditional prefix before the code-map sentence. The `.src.md` must keep the tier-conditional prefix in the source file and use `<!-- include: shared/context-loading.md -->` for the shared canonical sentence. The two must not merge into the include — keep them as separate adjacent elements.

7. **model-role-dispatch.md stub**: If `ao-pipeline-mode` has not shipped, write a minimal stub. The stub must not break any existing test that reads `implementation-agent.md`. Check: the only test for implementation-agent content currently checks for model-role Judge fields and plugin mirror. A comment-only stub is safe.

### Remaining Notes (APPROVED WITH NOTES)

- **parseFrontmatter fix is MANDATORY** — without it, every existing agent frontmatter test fails. This is the core risk of the feature and must be verified by running `npm test` after implementation.

- **Pre-existing token cap failures**: 3 failing tests exist before this feature. The implementation must not introduce additional token cap failures beyond these 3. Verify post-build: `node --test tests/` should show 3 (or fewer) token cap failures, not more.

- **EC-10 (deploy.sh dirty tree)**: The build step runs before the dirty-tree check. If the developer has edited `src/` files without building, the build will update tracked `.claude/agents/*.md` files. Then the dirty-tree check in deploy.sh will fail correctly ("commit built output before deploying"). This is expected and correct behavior.

- **em-dash in header**: The `—` character in the header is a Unicode em-dash (U+2014, 3 bytes in UTF-8). Ensure it is consistent across all 18 output files and that the contracts test string comparison handles it correctly (Node.js `===` comparison of UTF-8 strings is byte-correct by default).

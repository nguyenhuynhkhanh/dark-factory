## Domain Review: Architecture & Performance

### Feature: ao-compile-time-agents
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None.

**Concerns**:

1. **Token cap regression risk**: The spec rewrites all 9 agent files in both locations by adding the auto-generated header comment. The pre-existing test suite already has 3 token cap failures (onboard-agent at 6421 tokens vs 5500 cap, spec-agent at 5805 vs 5500, architect-agent at 5236 vs 5000). Adding a header line to each agent will increase token counts slightly (typically ~12-15 tokens per header). This will deepen the existing failures. The spec must ensure: (a) the implementation does NOT make the token cap failures worse by adding extraneous content, and (b) the auto-generated header comment is as compact as possible. The spec explicitly requires normalization of drifted copies (code-agent and test-agent context-loading abbreviations corrected to canonical form) — the corrected canonical form is longer, which will increase token counts for those two agents. This is acceptable since those agents are currently under cap, but the implementation must verify all 9 agents stay within their stated caps or document which cap exceedances are pre-existing.

2. **Circular include detection with nested includes**: EC-9 states shared files may contain `<!-- include: ... -->` directives (nested includes). FR-4 requires circular include detection. The implementation must handle: A includes B, B includes C, C includes A — not just direct A-B-A cycles. The spec acknowledges this in EC-9 and the Implementation Notes describe a `visitedStack` parameter. Confirm the implementation tracks the full chain, not just immediate parent.

3. **EC-7 (worktree path relativity)**: The spec correctly requires paths relative to worktree root. The build script uses `path.resolve(__dirname, '..')` which correctly resolves relative to the script file location, not the working directory. This is the correct approach and handles worktree execution correctly.

4. **The `--output-dir` flag mentioned in Implementation Notes**: The spec mentions a `--output-dir` flag for the contracts test but then notes "Simpler test approach" that avoids it. The contracts test approach must be finalized — if the test re-implements include resolution inline, there is a risk of the test and the build script diverging. Recommend: the test spawn `node bin/build-agents.js` to a temporary directory (with `--output-dir` support) rather than reimplementing the algorithm. If the test reimplements, it must be a faithful copy — divergence defeats the purpose of the test.

5. **pretest hook and idempotency with dirty worktrees**: The spec correctly notes in EC-10 that if `bin/build-agents.js` modifies tracked files, the `scripts/deploy.sh` dirty-tree check will catch it. However, the `pretest` hook runs before every `node --test tests/` call. If a developer has edited a `.src.md` file, the pretest hook will overwrite `.claude/agents/*.md` files — these are tracked files. This creates a behavior where running `npm test` silently modifies tracked files. This is the INTENDED behavior (the spec author confirms it on p. 163: "If the assembled output was already up-to-date, the overwrite is idempotent. If src/ files were edited without running the build, the assembled files are updated before tests run"). Confirm this is acceptable: it is — the build is idempotent and the header comment declares the files as derived. This is acceptable design.

6. **Model role dispatch stub**: The spec requires `model-role-dispatch.md` to exist as a stub if `ao-pipeline-mode` has not shipped. The stub content must be valid Markdown that doesn't break any existing test assertions in `dark-factory-setup.test.js`. Verify: no existing test checks `implementation-agent.md` for model-role-dispatch content that would be broken by a stub placeholder.

**Suggestions**:
- Consider adding a `// Zero external dependencies` comment at the top of `bin/build-agents.js` (after the header) to make the zero-dep constraint self-documenting for contributors — consistent with NFR-4.
- The Implementation Notes mention deduplication as a "second pass." An alternative is tracking seen includes during the single resolution pass. Either approach is valid; the spec is not prescriptive here.

### Memory Findings (architecture)
- Preserved: (none — memory index empty)
- Modified: none
- Potentially violated: none
- New candidates declared: INV-TBD-a (agent-source-of-truth), INV-TBD-b (build-before-test), INV-TBD-c (build-zero-deps), DEC-TBD-a (inline-substitution), DEC-TBD-b (src-not-distributed) — all have required fields (title, rule, scope, domain, enforced_by or enforcement, rationale). APPROVED.

### Key Decisions
- INV-TBD-a and INV-TBD-b are sound architectural invariants. The build-before-test invariant is enforced at runtime via npm lifecycle hooks — not testable as a static assertion, but documented correctly.
- The dual-write requirement (both `.claude/agents/` and `plugins/dark-factory/agents/`) is preserved — the build script writes to both TARGETS simultaneously, maintaining the existing mirror contract.
- Zero-dep invariant (INV-TBD-c) is consistent with `bin/cli.js` precedent.

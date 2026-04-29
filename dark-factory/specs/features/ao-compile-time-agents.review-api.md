## Domain Review: API Design & Backward Compatibility

### Feature: ao-compile-time-agents
### Status: APPROVED WITH NOTES

### Findings

**Blockers**: None.

**Concerns**:

1. **Backward compatibility with existing plugin mirror tests**: The contracts test suite has strict `assert.equal(source, plugin, ...)` checks for each agent. After the build, assembled agent files in `.claude/agents/*.md` must match `plugins/dark-factory/agents/*.md` byte-for-byte. The build writes to both TARGETS simultaneously from the same resolved content — this is correct and preserves the mirror contract. The existing mirror parity tests will continue to pass as long as both output locations receive identical content per agent. The implementation must NOT accidentally write to one target and not the other.

2. **Frontmatter name-match invariant**: Existing tests assert `fm.name === filename-stem`. The auto-generated header comment is added BEFORE the YAML frontmatter delimiter (`---`). The `parseFrontmatter()` helper in tests uses `content.match(/^---\n([\s\S]*?)\n---/)` — this regex requires `---` to start at position 0 of the string. If the header comment appears before `---`, the existing frontmatter parser will return `null` because the regex won't match. This is a CRITICAL compatibility issue.

   Current test parseFrontmatter logic (from setup test line ~28):
   ```js
   const match = content.match(/^---\n([\s\S]*?)\n---/);
   if (!match) return null;
   ```

   If the header comment `<!-- AUTO-GENERATED ... -->` appears on line 1 and `---` appears on line 2, then `content.match(/^---\n...)` will fail because `^` anchors to the very start of the string and the first character is `<`, not `-`.

   The spec notes (Migration & Deployment, point 3): "The auto-generated header comment is added as a new first line; existing tests do string-matching on content inside the file and will continue to pass because the header does not conflict with any existing test assertion." This is INCORRECT for the `parseFrontmatter` function. The frontmatter parser uses a start-of-string anchor.

   **Resolution required**: Either (a) update `parseFrontmatter()` in both test files to allow optional content before the opening `---`, or (b) place the header comment AFTER the frontmatter (making it line 2 after `---\n` but before the frontmatter content). Option (b) would be non-standard (comments inside frontmatter). The correct fix is option (a): update `parseFrontmatter` to handle a file that begins with an HTML comment followed by `---`.

   Updated regex: `content.match(/(?:<!--[\s\S]*?-->\s*\n)?---\n([\s\S]*?)\n---/)` or more simply: strip any HTML comment prefix before matching. This concern is a HARD BLOCKER for all 27 tests that read frontmatter (9 agents × 3 assertions: exists, frontmatter valid, name matches).

3. **Frontmatter name field assertion**: After fixing parseFrontmatter, the `fm.name === filename-stem` assertion must still pass. The auto-generated header uses `{name}` as the agent name in the comment (e.g., `<!-- AUTO-GENERATED — edit src/agents/spec-agent.src.md then run: npm run build:agents -->`). The YAML `name` field inside the frontmatter remains unchanged. This is correct.

4. **Contracts test `--output-dir` flag design**: The spec's Implementation Notes describe a contracts test that runs the build script to a temp directory. If `bin/build-agents.js` is designed for `--output-dir` support, this is an additional API surface that must be documented in the spec (or clearly noted as internal-use only). The simpler alternative (re-implementing include resolution in-test) avoids adding a flag but risks test-vs-implementation divergence. Recommend documenting which approach is chosen in the spec's Implementation Notes and enforcing it.

**Suggestions**:
- The auto-generated header format `<!-- AUTO-GENERATED — edit src/agents/{name}.src.md then run: npm run build:agents -->` uses an em-dash (—) which is a multi-byte UTF-8 character. Ensure the header is compared as a string (not byte-count) in tests, and that the em-dash is preserved correctly on all platforms (macOS, Linux CI).

### Memory Findings (api)
- Preserved: (none — memory index empty)
- New candidates: none in the API domain specifically
- Potentially violated: none

### Key Decisions
- The parseFrontmatter fix is mandatory before tests can pass. This is a spec gap — the spec's Migration & Deployment section incorrectly states existing tests will continue to pass without modification.
- The `parseFrontmatter()` function is a TEST-INTERNAL UTILITY (defined identically in both test files). Updating it is within scope of the spec's stated test file modifications.

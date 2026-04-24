# Scenario: Setup test catches a shard entry with a missing required field

## Type
edge-case

## Priority
critical — if a setup test doesn't catch a missing required field in a shard entry, every downstream sub-spec inherits broken memory.

## Preconditions
- `tests/dark-factory-setup.test.js` exists with the new memory assertions.
- The current shipped shard files are well-formed (frontmatter only, zero entries — this is valid state; the test passes on clean ship).

## Action
To verify the schema-check test actually catches bad entries, simulate a future state where a shard has been partially written with a malformed entry:

Temporarily inject a malformed entry into `dark-factory/memory/invariants-architecture.md`:
```markdown
## INV-0001: Every spec must declare the invariants it touches

- **rule**: All specs include an Invariants section.
- **domain**: architecture
- **status**: active
- **introducedBy**: project-memory-foundation
- **introducedAt**: 2026-04-24
```
(The entry is missing both `enforced_by` AND `enforcement` — violating FR-8 / BR-4.)

Also inject: remove the `shard` field from an entry in `dark-factory/memory/decisions-security.md`:
```markdown
## DEC-0001: Security decisions are reviewed by the security domain architect

- **context**: ...
- **decision**: ...
- **domain**: security
- **status**: active
```
(Missing the required `shard` field.)

Run the test suite. Restore the files after the test.

## Expected Outcome
- Baseline (unmodified, zero-entry files) run: all tests pass.
- With the malformed invariant entry (missing `enforced_by` AND `enforcement`): at least one assertion fails with a message identifying the missing field.
- With the malformed decision entry (missing `shard`): at least one assertion fails with a message identifying the missing field.
- No test hangs or crashes — all failures are deterministic.

## Notes
Validates EC-6, FR-19. This is a test-the-tests scenario: verifies that the new setup assertions actually catch malformed shard entries, not just assert the files exist. Note: on clean ship, shard files have zero entries, so this scenario simulates the future write state that lifecycle and consumer sub-specs will produce.

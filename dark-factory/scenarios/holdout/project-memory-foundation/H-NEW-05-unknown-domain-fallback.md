# Scenario: Unknown domain value in an index entry triggers a test failure and security fallback is documented

## Type
edge-case

## Priority
medium — the closed domain enum (`security`, `architecture`, `api`) is the routing contract for shard loading. An unknown domain breaks routing; the documented fallback prevents silent data loss.

## Preconditions
- `dark-factory/memory/index.md` exists.
- `dark-factory/templates/project-memory-template.md` exists.

## Action
Part 1 — Template documents the fallback:
Read `project-memory-template.md`. Search for prose describing what happens when an entry's domain value is not one of the three allowed values (`security`, `architecture`, `api`).

Part 2 — Structural test catches unknown domain (mutation test):
Temporarily inject a malformed index entry into `index.md`:
```
## INV-0001 [type:invariant] [domain:performance] [tags:] [status:active] [shard:invariants-security.md]
Performance-critical paths must be benchmarked
```
(`domain:performance` is not in the allowed enum.)

Run the structural test. Restore the file.

## Expected Outcome
- Part 1: The template documents that an unknown domain value should be treated as `security` (most conservative fallback) and that writers MUST NOT use values outside `security | architecture | api`. The fallback behavior is documented explicitly.
- Part 2: The structural test detects `domain:performance` as an invalid value and fails with a clear diagnostic ("unknown domain value 'performance'; allowed values: security, architecture, api").
- The mutation test is deterministic — no hangs or crashes.

## Notes
Validates EC-11, FR-3. The `security` fallback is the most conservative choice: security entries are reviewed most carefully, so routing an unknown-domain entry there is safer than routing to `architecture` or `api`. This behavior must be documented in the template even though the routing logic itself is implemented in `project-memory-consumers`.

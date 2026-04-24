# Scenario: .gitignore does not match memory; results is still gitignored; no inadvertent broad pattern

## Type
edge-case

## Priority
critical — a single accidentally-broad gitignore rule (e.g., `dark-factory/*`) would silently exclude memory from version control.

## Preconditions
- `.gitignore` exists at repository root.
- `dark-factory/memory/` directory exists with all eight files.

## Action
Read `.gitignore`. For each line that is not a comment or blank, test whether it matches:
- `dark-factory/memory/` (directory)
- `dark-factory/memory/index.md`, `invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`, `ledger.md` (all eight files)
- `dark-factory/results/` (still should match — backward compat)
- `dark-factory/manifest.json` (still should NOT match)

## Expected Outcome
- No gitignore rule matches `dark-factory/memory/` or any file inside it.
- At least one gitignore rule still matches `dark-factory/results/` (preserved behavior).
- No rule matches `dark-factory/manifest.json` (preserved behavior).
- Running `git check-ignore dark-factory/memory/index.md` exits NON-zero (meaning the file is NOT ignored). If the runner can execute git, run this check; otherwise rely on the pattern-match logic above. Also check at least one shard file: `git check-ignore dark-factory/memory/invariants-security.md`.

## Notes
Validates FR-18, EC-5. Uses actual gitignore semantics rather than a naive substring match — catches accidental overbroad patterns that would match via glob expansion. Eight files are now in scope (previously three).

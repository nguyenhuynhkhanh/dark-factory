# Scenario: P-07 — README uninstall section provides a complete removal procedure

## Type
feature

## Priority
medium — developers who leave a team need a clean removal path; missing documentation leads to leftover config files and PATH entries

## Preconditions
- `README.md` has been updated per the spec

## Action
Read the uninstall section of `README.md`.

## Expected Outcome
- An uninstall section exists
- It includes a command to remove the `~/.df-factory/` directory (e.g., `rm -rf ~/.df-factory/`)
- It describes how to remove the PATH line from the shell profile (`~/.zshrc` / `~/.bashrc`) — either a manual instruction or a one-liner command
- Both `~/.zshrc` (macOS) and `~/.bashrc` (Linux) are mentioned as places the PATH line may have been added

## Failure Mode
N/A

## Notes
The uninstall instructions do not need to be a single one-liner; clear multi-step instructions are acceptable. What matters is completeness — the user should have no leftover config after following the instructions.

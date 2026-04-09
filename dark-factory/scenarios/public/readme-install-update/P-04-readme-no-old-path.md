# Scenario: P-04 — README contains no references to old install path

## Type
feature

## Priority
critical — the incorrect path is the root cause of this entire spec; it must be fully removed

## Preconditions
- `README.md` has been updated per the spec

## Action
Search the contents of `README.md` for the string `~/.local/bin`.

## Expected Outcome
- Zero occurrences of `~/.local/bin` in `README.md`
- All install path references use `~/.df-factory/bin`

## Failure Mode
N/A — this is a static content check.

## Notes
Also verify the scripts table in the "One-line install" section correctly lists the three scripts and their purposes, and that the install directory shown matches `~/.df-factory/bin`.

# Scenario: P-05 — README documents both full-path and bare invocation

## Type
feature

## Priority
high — developers who have not yet sourced their profile will hit "command not found" if only the bare form is shown; developers who have sourced it benefit from knowing the shorter form works

## Preconditions
- `README.md` has been updated per the spec

## Action
Read the "Onboarding a developer" or equivalent section of `README.md` where the post-install step is described.

## Expected Outcome
- The section contains `~/.df-factory/bin/df-onboard.sh` (full path invocation)
- The section also shows or mentions `df-onboard.sh` (bare invocation)
- There is a note explaining that the bare form works after running `source ~/.zshrc` (or equivalent) or restarting the terminal

## Failure Mode
N/A

## Notes
The exact wording is not prescribed — what matters is that both forms are present and the sourcing requirement is explained.

# Scenario: H-03 — Idempotency check uses exact literal match, not fuzzy df-factory match

## Type
edge-case

## Priority
medium — a fuzzy match could suppress a legitimate re-add if the user's profile has a different df-factory line (e.g., from a manual edit or an old format); the check must be precise

## Preconditions
- `~/.df-factory/bin/` already installed
- `~/.zshrc` contains the following line (manually added by user in a different format):
  ```
  # df-factory installed here: ~/.df-factory/bin
  ```
  (A comment containing "df-factory" but NOT the exact PATH export line)
- `$SHELL` is `/bin/zsh`

## Action
Run the install command:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- The PATH export line IS appended to `~/.zshrc` (because the fuzzy comment line does not match the exact export line)
- `~/.zshrc` now contains both the comment and the export line
- The script does NOT falsely skip the append because it found a different df-factory reference

## Failure Mode
If the PATH line is not appended (false positive idempotency), the user's shell won't have the PATH configured despite the script claiming success.

## Notes
This validates BR-1. The grep check must use the full, exact export line as its pattern with fixed-string matching (`grep -F` or equivalent).

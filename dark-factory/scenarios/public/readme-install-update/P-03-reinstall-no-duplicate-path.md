# Scenario: P-03 — Re-running install does not duplicate PATH line

## Type
feature

## Priority
critical — re-run is the documented upgrade path; duplicate PATH lines accumulate on every upgrade and corrupt the profile over time

## Preconditions
- `install.sh` has already been run once
- `~/.df-factory/bin/` exists with all three scripts installed
- `~/.zshrc` already contains exactly one occurrence of:
  ```
  export PATH="$HOME/.df-factory/bin:$PATH"
  ```
- `$SHELL` is `/bin/zsh`

## Action
Run the install command a second time:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- Scripts are re-downloaded and overwritten (idempotent)
- `~/.zshrc` still contains exactly ONE occurrence of the PATH export line — not two
- Terminal output acknowledges that PATH is already configured (e.g., "PATH already configured in ~/.zshrc" or equivalent)

## Failure Mode
N/A

## Notes
Count occurrences of the line in `~/.zshrc` after the second run. The count must be 1, not 2.

# Scenario: H-01 — Unknown or unset $SHELL falls back to ~/.bashrc with a warning

## Type
edge-case

## Priority
high — a user with an uncommon shell (fish, sh, tcsh) or a broken environment would otherwise silently get no PATH configuration

## Preconditions
- Clean machine: `~/.df-factory/` does not exist
- `~/.bashrc` exists but does not contain any reference to `df-factory`
- `$SHELL` is unset, empty, or set to a value that contains neither `zsh` nor `bash` (e.g., `/bin/fish`, `/bin/sh`, empty string)

## Action
Run the install script with the modified environment:
```bash
SHELL=/bin/fish bash <(curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh)
```
or equivalently, run the script directly with `$SHELL` overridden.

## Expected Outcome
- Scripts are installed successfully to `~/.df-factory/bin/`
- `~/.bashrc` contains the PATH export line (fallback target)
- `~/.zshrc` is NOT modified
- Terminal output includes a warning message indicating the detected shell was unrecognized and that `~/.bashrc` was used as the fallback — the user is not left guessing which file was modified
- The script does NOT exit with an error code

## Failure Mode
If the script exits non-zero or writes nothing to any profile, the test fails.

## Notes
This covers BR-4 (fallback not silent) and EC-1. The warning must name the file that was used.

# Scenario: H-02 — $SHELL path with suffix (e.g., /usr/local/bin/zsh) is still detected as zsh

## Type
edge-case

## Priority
medium — on some systems (Homebrew-installed zsh, NixOS), the zsh binary path is not `/bin/zsh`; detection must use substring matching, not exact equality

## Preconditions
- Clean machine: `~/.df-factory/` does not exist
- `$SHELL` is set to a non-standard path, e.g., `/usr/local/bin/zsh` or `/opt/homebrew/bin/zsh`
- `~/.zshrc` exists but does not contain any reference to `df-factory`

## Action
Run the install script with the overridden SHELL:
```bash
SHELL=/usr/local/bin/zsh bash <(curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh)
```

## Expected Outcome
- `~/.zshrc` contains the PATH export line (not `~/.bashrc`)
- No warning about unrecognized shell is printed

## Failure Mode
If `~/.bashrc` is modified instead of `~/.zshrc`, the shell detection is using exact match instead of substring match.

## Notes
The implementation must use a pattern like `case "$SHELL" in *zsh*) ...` or `[[ "$SHELL" == *zsh* ]]` to handle non-standard installation paths.

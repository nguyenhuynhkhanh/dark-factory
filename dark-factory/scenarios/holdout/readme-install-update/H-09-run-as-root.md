# Scenario: H-09 — Install script run as root uses root's $HOME

## Type
edge-case

## Priority
low — uncommon but possible in automated provisioning pipelines; the script should not special-case root but should behave consistently with $HOME resolution

## Preconditions
- Script is run as root (e.g., `sudo bash <(curl ...)`)
- `$HOME` is `/root` (standard for root on Linux)
- `/root/.bashrc` exists
- `$SHELL` is `/bin/bash`

## Action
Run the install script as root:
```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh)
```

## Expected Outcome
- Scripts are installed to `/root/.df-factory/bin/`
- `/root/.bashrc` receives the PATH export line: `export PATH="$HOME/.df-factory/bin:$PATH"`
- When this line is evaluated in a root shell, it resolves to `/root/.df-factory/bin`
- The script exits 0 without special-casing root or printing warnings about running as root

## Failure Mode
N/A — no expected failure; this is a correctness check for an unusual but valid scenario.

## Notes
This covers EC-5. The implementation does not need to handle root differently — `$HOME` resolves correctly by the OS. The test simply verifies the script doesn't hard-code paths or fail on a non-standard home directory.

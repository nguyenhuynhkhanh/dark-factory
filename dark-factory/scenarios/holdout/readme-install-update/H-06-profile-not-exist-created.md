# Scenario: H-06 — Shell profile does not exist; install creates it with PATH line

## Type
edge-case

## Priority
medium — new user accounts, CI environments, and minimal Docker images often have no ~/.zshrc or ~/.bashrc; the script must not fail when the target file is absent

## Preconditions
- Clean machine: `~/.df-factory/` does not exist
- `~/.zshrc` does NOT exist (not just empty — the file is entirely absent)
- `$SHELL` is `/bin/zsh`

## Action
Run the install command:
```bash
curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash
```

## Expected Outcome
- `~/.df-factory/bin/` is created with all three scripts installed
- `~/.zshrc` is created (did not exist before)
- `~/.zshrc` contains the PATH export line
- The script exits with code 0
- A subsequent second run of the install command results in exactly one occurrence of the PATH line (idempotency still holds even for the newly created file)

## Failure Mode
If the script exits non-zero or prints an error about the missing profile file, the implementation used a non-creating redirect (e.g., checked file existence before appending instead of using `>>` which creates the file automatically).

## Notes
This covers EC-2. The `>>` append operator creates the file if it does not exist in bash/zsh. No explicit `touch` should be needed.

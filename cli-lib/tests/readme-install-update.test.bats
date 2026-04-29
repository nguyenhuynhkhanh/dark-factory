#!/usr/bin/env bats
# Holdout validation tests for readme-install-update feature
# Tests: H-01 through H-10

setup() {
  # Create a temp directory for each test to use as a fake home
  TEST_HOME="$(mktemp -d)"
  export HOME="$TEST_HOME"

  # We'll use the local install.sh but mock the curl download of scripts
  INSTALL_SH="/Users/nguyenhuynh/code/prime-factory/cli-lib/install.sh"

  # Create a fake curl that simulates successful script downloads
  # We'll override curl to write a dummy script instead of fetching from network
  export PATH="$TEST_HOME/fake-bin:$PATH"
  mkdir -p "$TEST_HOME/fake-bin"

  cat > "$TEST_HOME/fake-bin/curl" <<'EOF'
#!/usr/bin/env bash
# Fake curl: parse -o flag and write a dummy script there
OUTPUT=""
args=("$@")
for ((i=0; i<${#args[@]}; i++)); do
  if [[ "${args[$i]}" == "-o" ]]; then
    OUTPUT="${args[$((i+1))]}"
  fi
done
if [[ -n "$OUTPUT" ]]; then
  mkdir -p "$(dirname "$OUTPUT")"
  cat > "$OUTPUT" <<'SCRIPT'
#!/usr/bin/env bash
echo "fake script"
SCRIPT
fi
exit 0
EOF
  chmod +x "$TEST_HOME/fake-bin/curl"
}

teardown() {
  rm -rf "$TEST_HOME"
}

# H-01: Unknown or unset $SHELL falls back to ~/.bashrc with a warning
@test "H-01: unknown shell falls back to ~/.bashrc with a warning" {
  touch "$TEST_HOME/.bashrc"

  # Run with unrecognised shell and capture output
  script_output=$(SHELL=/bin/fish HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1)

  # ~/.bashrc should have the PATH line
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.bashrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]

  # ~/.zshrc should NOT be modified (may not even exist)
  if [[ -f "$TEST_HOME/.zshrc" ]]; then
    run grep -c 'df-factory' "$TEST_HOME/.zshrc"
    [ "$output" -eq 0 ]
  fi

  # Output should include a warning mentioning the fallback and the file
  echo "$script_output" | grep -qi "warn\|unrecognised\|unknown\|fallback\|bashrc"
}

# H-02: $SHELL path with suffix (e.g., /usr/local/bin/zsh) still detected as zsh
@test "H-02: non-standard zsh path (/usr/local/bin/zsh) still detected as zsh" {
  touch "$TEST_HOME/.zshrc"
  touch "$TEST_HOME/.bashrc"

  SHELL=/usr/local/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1

  # ~/.zshrc should have the PATH line
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]

  # ~/.bashrc should NOT have the PATH line
  run grep -c 'df-factory' "$TEST_HOME/.bashrc" 2>/dev/null || true
  [ "$output" -eq 0 ]
}

# H-03: Idempotency check uses exact literal match, not fuzzy df-factory match
@test "H-03: comment containing df-factory does not prevent PATH line from being appended" {
  # ~/.zshrc has a comment containing df-factory but NOT the exact PATH export line
  echo '# df-factory installed here: ~/.df-factory/bin' > "$TEST_HOME/.zshrc"

  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1

  # The exact PATH export line SHOULD be appended (comment does not match)
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]
}

# H-04: curl-pipe-bash runs under bash but detects user's login shell as zsh
@test "H-04: SHELL env var is used for detection even when script runs under bash" {
  touch "$TEST_HOME/.zshrc"
  touch "$TEST_HOME/.bashrc"

  # The script is run by bash explicitly, but $SHELL says zsh
  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1

  # ~/.zshrc should have the PATH line
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]

  # ~/.bashrc should NOT have the PATH line
  run grep -c 'df-factory' "$TEST_HOME/.bashrc" 2>/dev/null || true
  [ "$output" -eq 0 ]
}

# H-05: PATH line written uses $HOME, not literal tilde
@test "H-05: PATH line written to profile uses \$HOME not literal tilde" {
  touch "$TEST_HOME/.zshrc"

  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1

  # Check the raw content - must contain $HOME not ~
  run grep 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]

  # Must NOT contain the tilde form
  run grep 'export PATH="~/.df-factory/bin:' "$TEST_HOME/.zshrc"
  [ "$status" -ne 0 ]
}

# H-06: Shell profile does not exist; install creates it with PATH line
@test "H-06: profile file does not exist; install creates it with PATH line" {
  # ~/.zshrc does NOT exist
  [ ! -f "$TEST_HOME/.zshrc" ]

  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1

  # ~/.zshrc should now exist
  [ -f "$TEST_HOME/.zshrc" ]

  # and contain the PATH line
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]

  # Second run: still only one occurrence (idempotency on new file)
  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]
}

# H-07: Profile has tilde-form entry; $HOME-form is still appended
@test "H-07: tilde-form in profile does not prevent \$HOME-form from being appended" {
  # User has a manually added tilde form
  echo 'export PATH="~/.df-factory/bin:$PATH"' > "$TEST_HOME/.zshrc"

  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1

  # The $HOME form should be appended
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]

  # The original tilde form should still be there (not removed)
  run grep -c 'export PATH="~/.df-factory/bin:' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]
}

# H-08: Profile file open in another process does not cause data loss
@test "H-08: appending while file is open does not lose existing content" {
  # Create ~/.zshrc with some existing content
  cat > "$TEST_HOME/.zshrc" <<'EOF'
# My existing zsh config
alias ll='ls -la'
export EDITOR=vim
EOF

  original_lines=$(wc -l < "$TEST_HOME/.zshrc")

  # Simulate another process having the file open (open a tail in background)
  tail -f "$TEST_HOME/.zshrc" > /dev/null 2>&1 &
  TAIL_PID=$!

  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$INSTALL_SH" 2>&1

  kill "$TAIL_PID" 2>/dev/null || true

  # The PATH line should be appended
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]

  # All original content should still be present
  run grep 'alias ll' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]

  run grep 'export EDITOR=vim' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]

  # File should have more lines than original (content + added PATH)
  new_lines=$(wc -l < "$TEST_HOME/.zshrc")
  [ "$new_lines" -gt "$original_lines" ]
}

# H-09: Install script run as root uses root's $HOME
@test "H-09: script uses \$HOME variable so it works for any home directory" {
  # Simulate root-like env: set HOME to a non-standard path
  FAKE_ROOT_HOME="$(mktemp -d)"
  touch "$FAKE_ROOT_HOME/.bashrc"

  SHELL=/bin/bash HOME="$FAKE_ROOT_HOME" bash "$INSTALL_SH" 2>&1

  # Scripts should be installed to fake root's home
  [ -f "$FAKE_ROOT_HOME/.df-factory/bin/df-onboard.sh" ]

  # PATH line should go to fake root's ~/.bashrc using $HOME (not hardcoded path)
  run grep 'export PATH="$HOME/.df-factory/bin:$PATH"' "$FAKE_ROOT_HOME/.bashrc"
  [ "$status" -eq 0 ]

  # The line must NOT contain the expanded absolute path
  run grep "export PATH=\"$FAKE_ROOT_HOME/.df-factory/bin" "$FAKE_ROOT_HOME/.bashrc"
  [ "$status" -ne 0 ]

  rm -rf "$FAKE_ROOT_HOME"
}

# H-10: Script downloaded and run directly (not via pipe) behaves identically
@test "H-10: running script directly (not via pipe) gives same result as piping" {
  touch "$TEST_HOME/.zshrc"

  # Copy the install script to a temp location to simulate "downloaded and run directly"
  cp "$INSTALL_SH" "$TEST_HOME/install_direct.sh"
  chmod +x "$TEST_HOME/install_direct.sh"

  # Run directly, not via pipe
  SHELL=/bin/zsh HOME="$TEST_HOME" bash "$TEST_HOME/install_direct.sh" 2>&1

  # Identical outcome to P-01: PATH line in ~/.zshrc
  run grep -c 'export PATH="$HOME/.df-factory/bin:$PATH"' "$TEST_HOME/.zshrc"
  [ "$status" -eq 0 ]
  [ "$output" -eq 1 ]

  # Scripts installed
  [ -f "$TEST_HOME/.df-factory/bin/df-onboard.sh" ]
  [ -f "$TEST_HOME/.df-factory/bin/df-check-onboard.sh" ]
  [ -f "$TEST_HOME/.df-factory/bin/log-event.sh" ]
}

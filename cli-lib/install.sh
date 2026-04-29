#!/usr/bin/env bash
# Prime Factory CLI — installer
# Usage: curl -fsSL https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib/install.sh | bash

set -e

INSTALL_DIR="$HOME/.df-factory/bin"
BASE_RAW="https://raw.githubusercontent.com/nguyenhuynhkhanh/prime-factory/main/cli-lib"
SCRIPTS="df-onboard.sh df-check-onboard.sh log-event.sh"

echo "Installing Prime Factory CLI to $INSTALL_DIR ..."

mkdir -p -m 0700 "$INSTALL_DIR"

for script in $SCRIPTS; do
  curl -fsSL "$BASE_RAW/$script" -o "$INSTALL_DIR/$script"
  chmod +x "$INSTALL_DIR/$script"
done

# Detect shell profile
PROFILE_LINE='export PATH="$HOME/.df-factory/bin:$PATH"'

if echo "$SHELL" | grep -q "zsh"; then
  PROFILE_FILE="$HOME/.zshrc"
elif echo "$SHELL" | grep -q "bash"; then
  PROFILE_FILE="$HOME/.bashrc"
else
  PROFILE_FILE="$HOME/.bashrc"
  echo "Warning: unrecognised shell ($SHELL). Falling back to ~/.bashrc for PATH configuration."
fi

if grep -qF "$PROFILE_LINE" "$PROFILE_FILE" 2>/dev/null; then
  echo "PATH already configured in $PROFILE_FILE — skipping."
else
  printf '\n%s\n' "$PROFILE_LINE" >> "$PROFILE_FILE"
  echo "Added PATH entry to $PROFILE_FILE."
fi

echo ""
echo "Done."
echo ""
echo "To start using the CLI, run:"
echo "  source $PROFILE_FILE"
echo ""
echo "Or open a new terminal. After that, run 'df-onboard.sh' to get started."
echo "(You can also run the full path now: ~/.df-factory/bin/df-onboard.sh)"

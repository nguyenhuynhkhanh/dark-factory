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

echo ""
echo "Done. Run '~/.df-factory/bin/df-onboard.sh' to get started."

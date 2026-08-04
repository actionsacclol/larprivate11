#!/usr/bin/env bash
# Krypt LARP — local phone server (macOS / Linux).
# The counterpart to "Krypt LARP.cmd" on Windows.
#
#   chmod +x krypt-larp.sh   (once)
#   ./krypt-larp.sh

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed (or not on PATH)."
  echo "  Get it from https://nodejs.org  then run this again."
  echo
  exit 1
fi

node "tools/serve.js"

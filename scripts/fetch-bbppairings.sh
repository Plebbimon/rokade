#!/usr/bin/env bash
# Clones and builds bbpPairings (Apache-2.0, FIDE Dutch pairing engine) into vendor/.
# The @rokade/pairing package shells out to the resulting binary.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/vendor/bbpPairings"

if [ ! -d "$DEST" ]; then
  git clone --depth 1 https://github.com/BieremaBoyzProgramming/bbpPairings.git "$DEST"
fi

# macOS's g++ is Clang, which rejects the Makefile's GCC-only warning flags,
# and Apple Clang's -Wpoison-system-directories fires on /usr/local/include.
if [ "$(uname)" = "Darwin" ]; then
  make -C "$DEST" COMP=clang \
    'CXXFLAGS=$(optional_cxxflags) -Wno-poison-system-directories'
else
  make -C "$DEST"
fi
echo "Built: $DEST/bbpPairings.exe"

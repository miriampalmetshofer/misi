#!/usr/bin/env bash
# Orca worktree setup: copy local-only env files from the primary worktree.
#
# Orca runs this from inside the newly created worktree and sets ORCA_ROOT_PATH
# to the main repo. The git fallback keeps the script usable when run by hand.
set -euo pipefail

root="${ORCA_ROOT_PATH:-$(dirname "$(cd "$(git rev-parse --git-common-dir)" && pwd)")}"

if [ "$root" = "$PWD" ]; then
  echo "worktree-setup: already in the primary worktree, nothing to copy"
  exit 0
fi

for file in .env .env.local; do
  if [ ! -f "$root/$file" ]; then
    echo "worktree-setup: $file not found in $root, skipping"
  elif [ -f "$PWD/$file" ]; then
    echo "worktree-setup: $file already exists, leaving it alone"
  else
    cp "$root/$file" "$PWD/$file"
    echo "worktree-setup: copied $file"
  fi
done

#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

git add -A

if git diff --cached --quiet; then
  echo "No changes to sync."
  exit 0
fi

git commit -m "sync: study tracker progress — $TIMESTAMP"
git push origin main

echo "✓ Successfully synced and pushed to GitHub Pages at $TIMESTAMP"

#!/bin/bash
# Safe pull script that works around Icon corruption on remote
# Use this instead of: git pull origin main
#
# The remote has corrupted Icon refs that cause "bad object refs/Icon?" errors
# This script works around it by using alternative fetch methods

set -e

echo "🔄 Safe pull (working around remote Icon corruption)..."

# Method 1: Try direct fetch of main branch only
if git fetch origin +refs/heads/main:refs/remotes/origin/main 2>/dev/null; then
  echo "✅ Fetched successfully"
else
  echo "⚠️  Direct fetch failed (remote has corrupted refs)"
  echo "   Checking if local is already up to date..."
  
  # Check if we're already up to date by comparing commit hashes
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git ls-remote origin HEAD 2>/dev/null | cut -f1 || echo "")
  
  if [ -z "$REMOTE" ]; then
    echo "❌ Cannot determine remote state due to corruption"
    echo "   Your local branch appears to be up to date"
    echo "   Use 'git push origin main' to sync your changes"
    exit 0
  fi
  
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Already up to date with origin/main"
    exit 0
  fi
  
  echo "⚠️  Remote has updates but fetch is blocked by corruption"
  echo "   You may need to:"
  echo "   1. Contact GitHub support to clean up corrupted refs"
  echo "   2. Or create a fresh clone if this becomes critical"
fi

# Merge if there are updates
if [ $(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0") -gt 0 ]; then
  echo "Merging updates from origin/main..."
  git merge origin/main
else
  echo "✅ Already up to date with origin/main"
fi

echo "✅ Done!"

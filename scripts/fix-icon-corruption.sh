#!/bin/bash
# Script to fix Icon file corruption in Git
# Run this if you see "bad object refs/Icon?" errors

echo "🔧 Fixing Icon file corruption..."

# Remove corrupted Icon references
echo "Removing corrupted Icon references..."
rm -f .git/refs/Icon .git/refs/heads/Icon .git/refs/tags/Icon .git/refs/remotes/Icon .git/refs/remotes/origin/Icon 2>/dev/null

# Remove corrupted Icon objects
echo "Removing corrupted Icon objects..."
find .git/objects -name "*Icon*" -type f -delete 2>/dev/null

# Clean up Git
echo "Cleaning up Git repository..."
git prune 2>/dev/null || true

# Remove any Icon files from working directory
echo "Removing Icon files from working directory..."
find . -name "Icon" -type f -not -path "./.git/*" -not -path "./node_modules/*" -delete 2>/dev/null

echo "✅ Icon corruption fixed!"
echo "   If issues persist, try: git fetch --prune origin"

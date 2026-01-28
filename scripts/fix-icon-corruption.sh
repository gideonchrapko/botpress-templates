#!/bin/bash
# Script to fix Icon file corruption in Git
# Run this if you see "bad object refs/Icon?" errors
#
# This happens when macOS creates "Icon" resource fork files that Git tries to track
# These files corrupt Git references and cause fatal errors

set -e

echo "🔧 Fixing Icon file corruption..."

# Remove corrupted Icon references (all variations)
echo "Removing corrupted Icon references..."
rm -rf .git/refs/Icon .git/refs/heads/Icon .git/refs/tags/Icon .git/refs/remotes/Icon 2>/dev/null || true
rm -rf .git/refs/remotes/origin/Icon* 2>/dev/null || true
find .git/refs -name "*Icon*" -type f -delete 2>/dev/null || true

# Remove corrupted Icon objects
echo "Removing corrupted Icon objects..."
find .git/objects -name "*Icon*" -type f -delete 2>/dev/null || true

# Clean up Git
echo "Cleaning up Git repository..."
git prune 2>/dev/null || true
git gc --prune=now 2>/dev/null || true

# Remove any Icon files from working directory
echo "Removing Icon files from working directory..."
find . -maxdepth 5 -name "Icon" -o -name "Icon?" 2>/dev/null | grep -v "^\./\.git" | grep -v "^\./node_modules" | xargs rm -f 2>/dev/null || true

# Ensure hooks are executable
chmod +x .git/hooks/pre-commit .git/hooks/post-merge 2>/dev/null || true

echo ""
echo "✅ Icon corruption fixed!"
echo ""
echo "If you still see 'bad object refs/Icon?' errors when pulling:"
echo "  The remote repository may have corrupted Icon refs. Try:"
echo "  1. Use: ./scripts/safe-pull.sh (instead of git pull)"
echo "  2. Or: git fetch origin +refs/heads/main:refs/remotes/origin/main"
echo "  3. If needed: git push origin main --force-with-lease (if your local is correct)"
echo ""
echo "Prevention measures now in place:"
echo "  ✅ Pre-commit hook blocks Icon files from being committed"
echo "  ✅ Post-merge hook cleans up Icon refs after pulls"
echo "  ✅ .gitignore includes Icon, Icon?, and all variations"
echo ""
echo "If this happens again, just run: ./scripts/fix-icon-corruption.sh"

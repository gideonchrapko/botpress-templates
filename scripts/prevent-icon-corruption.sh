#!/bin/bash
# Comprehensive protection script to prevent Icon file corruption
# Run this once to set up all protections

set -e

echo "🛡️  Setting up Icon corruption prevention..."

# 1. Ensure .gitignore has Icon patterns
if ! grep -q "^Icon$" .gitignore 2>/dev/null; then
  echo "Adding Icon patterns to .gitignore..."
  cat >> .gitignore << 'EOF'

# Icon files (macOS placeholder files that cause Git corruption)
# These MUST be ignored to prevent Git ref corruption
Icon
**/Icon
Icon?
**/Icon?
*.Icon
**/*.Icon
EOF
fi

# 2. Ensure pre-commit hook exists and is executable
if [ ! -f .git/hooks/pre-commit ] || ! grep -q "Icon" .git/hooks/pre-commit 2>/dev/null; then
  echo "Setting up pre-commit hook..."
  cat > .git/hooks/pre-commit << 'HOOK_EOF'
#!/bin/sh
# Prevent Icon files from being committed (macOS resource fork files)
# These can corrupt Git refs and cause fatal errors

STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)

if [ -n "$STAGED_FILES" ]; then
  if echo "$STAGED_FILES" | grep -qiE "(^|/)Icon(\?|$)" > /dev/null; then
    echo "❌ Error: Cannot commit 'Icon' files (macOS resource fork)"
    echo "   These files corrupt Git references. Remove them and try again."
    echo ""
    echo "   Found: $(echo "$STAGED_FILES" | grep -iE "(^|/)Icon(\?|$)" | head -5)"
    echo ""
    echo "   Run: git reset HEAD <file> to unstage"
    exit 1
  fi
fi

exit 0
HOOK_EOF
  chmod +x .git/hooks/pre-commit
fi

# 3. Ensure post-merge hook exists and is executable
if [ ! -f .git/hooks/post-merge ]; then
  echo "Setting up post-merge hook..."
  cat > .git/hooks/post-merge << 'HOOK_EOF'
#!/bin/sh
# Post-merge hook: Clean up any Icon refs that might have been pulled
# This prevents Icon corruption from propagating

rm -f .git/refs/Icon .git/refs/heads/Icon .git/refs/tags/Icon .git/refs/remotes/Icon 2>/dev/null || true
find .git/refs -name "*Icon*" -type f -delete 2>/dev/null || true
find . -maxdepth 3 -name "Icon" -type f -not -path "./.git/*" -not -path "./node_modules/*" -delete 2>/dev/null || true

exit 0
HOOK_EOF
  chmod +x .git/hooks/post-merge
fi

# 4. Clean up any existing corruption
echo "Cleaning up any existing corruption..."
rm -rf .git/refs/Icon .git/refs/heads/Icon .git/refs/tags/Icon .git/refs/remotes/Icon 2>/dev/null || true
find .git/refs -name "*Icon*" -type f -delete 2>/dev/null || true
find .git/objects -name "*Icon*" -type f -delete 2>/dev/null || true
git prune 2>/dev/null || true

# 5. Remove Icon files from working directory
echo "Removing Icon files from working directory..."
find . -maxdepth 5 -name "Icon" -o -name "Icon?" 2>/dev/null | grep -v "^\./\.git" | grep -v "^\./node_modules" | xargs rm -f 2>/dev/null || true

echo ""
echo "✅ Protection setup complete!"
echo ""
echo "Protections in place:"
echo "  ✅ .gitignore patterns for Icon files"
echo "  ✅ Pre-commit hook prevents Icon commits"
echo "  ✅ Post-merge hook cleans up Icon refs"
echo "  ✅ Existing corruption cleaned up"
echo ""
echo "If you see Icon corruption errors, run: ./scripts/fix-icon-corruption.sh"

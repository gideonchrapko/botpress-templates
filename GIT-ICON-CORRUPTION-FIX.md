# Git Icon Corruption Fix & Prevention

## The Problem

macOS creates "Icon" resource fork files that can corrupt Git references, causing errors like:
```
fatal: bad object refs/Icon?
error: https://github.com/... did not send all necessary objects
```

## Quick Fix

If you see Icon corruption errors, run:
```bash
./scripts/fix-icon-corruption.sh
```

## Prevention Measures (Already Set Up)

✅ **Pre-commit hook** - Blocks Icon files from being committed  
✅ **Post-merge hook** - Cleans up Icon refs after pulls  
✅ **.gitignore patterns** - Ignores Icon, Icon?, and all variations  
✅ **Safe pull script** - Use `./scripts/safe-pull.sh` instead of `git pull`

## If Git Pull Still Fails

If you still get errors when pulling, the remote might have corrupted refs. Try:

1. **Use the safe pull script:**
   ```bash
   ./scripts/safe-pull.sh
   ```

2. **Or fetch directly:**
   ```bash
   git fetch origin +refs/heads/main:refs/remotes/origin/main
   git merge origin/main
   ```

3. **If your local is correct and remote is corrupted:**
   ```bash
   git push origin main --force-with-lease
   ```

## Setting Up Protection (One-Time)

If you're setting up a new clone or want to ensure all protections are in place:

```bash
./scripts/prevent-icon-corruption.sh
```

This will:
- Add Icon patterns to `.gitignore`
- Set up pre-commit and post-merge hooks
- Clean up any existing corruption
- Make hooks executable

## How It Works

1. **Pre-commit hook** checks staged files before every commit
2. **Post-merge hook** cleans up Icon refs after every pull/merge
3. **.gitignore** prevents Icon files from being tracked
4. **Fix script** removes corrupted refs and objects

## Why This Happens

macOS creates invisible "Icon" files as resource forks. When Git tries to track these:
- They corrupt Git references (`.git/refs/Icon`)
- They cause "bad object" errors
- They prevent pulls and pushes

The solution is to **never track Icon files** and **clean up any that get created**.

## Testing

To verify protections are working:

```bash
# Try to stage an Icon file (should fail)
touch Icon
git add Icon
# Should see: "❌ Error: Cannot commit 'Icon' files"

# Clean up
rm Icon
```

---

**Last Updated**: 2026-01-28  
**Status**: ✅ All protections active

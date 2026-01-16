# Execute File Renaming - Step by Step

This is your execution plan for renaming all 85 files from PascalCase to kebab-case.

## Pre-Flight Check

Current directory: `/Users/Craig/Developer/Projects/mia-frontend`

```bash
# Verify you're in the right place
pwd
# Should output: /Users/Craig/Developer/Projects/mia-frontend

# Check current status
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -name "*[A-Z]*" | wc -l
# Should output: ~85 (files to rename)

# Make scripts executable
chmod +x auto-rename.sh verify-kebab-case.sh update-imports.py
```

## Choose Your Path

### Path 1: IDE Refactoring (RECOMMENDED - Safest, Most Reliable)

**Time**: ~30-45 minutes
**Risk**: Low
**Auto-updates imports**: Yes

#### Steps:

1. **Open VS Code**
   ```bash
   code .
   ```

2. **Open the checklist**
   - Open `rename-checklist.md` in VS Code
   - Split editor (Cmd/Ctrl + \)
   - Keep checklist on one side, file explorer on other

3. **Rename each file**
   For each file in the checklist:
   - Find file in VS Code file explorer
   - Right-click → "Rename..."
   - Type new kebab-case name
   - Press Enter
   - When prompted "Update imports?" → Click **Yes**
   - Check off item in checklist

4. **Verify**
   ```bash
   ./verify-kebab-case.sh
   npm run type-check
   npm run build
   ```

5. **Commit**
   ```bash
   git add -A
   git commit -m "refactor: Rename all files to kebab-case per agents.md"
   ```

### Path 2: Semi-Automated (Fast, Requires Manual Import Fixing)

**Time**: ~10-15 minutes
**Risk**: Medium
**Auto-updates imports**: Via script (may need manual fixes)

#### Steps:

1. **Run automated rename**
   ```bash
   ./auto-rename.sh
   ```
   This renames files but NOT imports.

2. **Update imports (choose one)**

   Option A - Python (Recommended):
   ```bash
   python3 update-imports.py
   ```

   Option B - Node.js:
   ```bash
   npm install glob
   node update-imports.js
   node update-imports-worker.js
   ```

3. **Verify and fix**
   ```bash
   # Verify all renamed
   ./verify-kebab-case.sh

   # Check for errors
   npm run type-check

   # If errors, fix manually and re-run
   # Common: Search for old import patterns
   grep -r "from './[A-Z]" src/
   ```

4. **Build and test**
   ```bash
   npm run build
   ```

5. **Commit**
   ```bash
   git add -A
   git commit -m "refactor: Rename all files to kebab-case per agents.md"
   ```

## Special Files - Pay Attention!

These 3 files need careful attention as they're being renamed AND simplified:

```bash
# 1. MainViewCopy.tsx → main-view.tsx
#    Check any components importing "MainViewCopy"
#    Update to import "MainView" (capital M, V) from './main-view'

# 2. OnboardingChatV2.tsx → onboarding-chat.tsx
#    Check any components importing "OnboardingChatV2"
#    Update to import "OnboardingChat" from './onboarding-chat'

# 3. BronzeCardV2.tsx → bronze-card.tsx
#    Check features/onboarding/ components
#    Update to import "BronzeCard" from './bronze-card'
```

## Verification Checklist

Run these commands in order:

```bash
# 1. All files renamed?
./verify-kebab-case.sh
# Expected: ✅ Success! All TypeScript files are now in kebab-case.

# 2. TypeScript compiles?
npm run type-check
# Expected: No errors

# 3. Project builds?
npm run build
# Expected: Build succeeds

# 4. No old import patterns?
grep -r "from './[A-Z]" src/ || echo "✅ Clean"
grep -r 'from "./[A-Z]' src/ || echo "✅ Clean"

# 5. Special renames complete?
grep -r "MainViewCopy" src/ || echo "✅ MainViewCopy removed"
grep -r "OnboardingChatV2" src/ || echo "✅ OnboardingChatV2 removed"
grep -r "BronzeCardV2" src/ || echo "✅ BronzeCardV2 removed"

# 6. Git status looks good?
git status
# Expected: Shows renames, not deletions + additions
```

## What Success Looks Like

```bash
$ ./verify-kebab-case.sh
=== Checking for remaining PascalCase files ===

✅ Success! All TypeScript files are now in kebab-case.

=== Summary ===
Total TypeScript files: 156
All files are properly named! ✅

$ npm run type-check
# No errors

$ npm run build
# Build succeeds

$ git status
# Shows renames like:
renamed:    src/App.tsx -> src/app.tsx
renamed:    src/components/MainViewCopy.tsx -> src/components/main-view.tsx
# etc...
```

## Troubleshooting

### "Cannot find module" errors

```bash
# Find the problematic import
npm run type-check 2>&1 | grep "Cannot find module"

# Search for the old name in your codebase
grep -r "OldFileName" src/

# Update manually or re-run import updater
```

### Build fails with Vite errors

```bash
# Clear Vite cache
rm -rf node_modules/.vite/
rm -rf dist/

# Rebuild
npm run build
```

### Git shows delete + add instead of rename

```bash
# Reset and re-add
git reset HEAD .
git add -A
git status  # Should now show renames
```

### Import updater missed some files

```bash
# Find files with old imports
grep -r "from './[A-Z]" src/

# Update manually in your editor
# Pattern: Change './OldFile' to './new-file'
```

## Rollback

If something goes seriously wrong:

```bash
# If you haven't committed
git restore .
git clean -fd

# If you have committed
git log  # Find the commit hash before rename
git revert <commit-hash>

# Or hard reset (dangerous!)
git reset --hard HEAD~1
```

## After Success

1. **Verify one more time**
   ```bash
   npm run type-check && npm run build
   ```

2. **Commit your changes**
   ```bash
   git add -A
   git commit -m "refactor: Rename all files to kebab-case per agents.md

   - Convert 85 files from PascalCase to kebab-case
   - Remove legacy suffixes (Copy, V2)
   - Update all import statements
   - Follows naming convention specified in agents.md"
   ```

3. **Clean up helper files** (optional)
   ```bash
   rm RENAME-*.md rename-*.{md,json}
   rm auto-rename.sh verify-kebab-case.sh
   rm update-imports.{js,py} update-imports-worker.js
   git add -A
   git commit -m "chore: Remove renaming helper files"
   ```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./verify-kebab-case.sh` | Check if all files renamed |
| `npm run type-check` | Verify TypeScript compiles |
| `npm run build` | Verify project builds |
| `git status` | Check git sees renames |
| `python3 update-imports.py` | Update import statements |

## Need More Help?

- Read `RENAMING-GUIDE.md` for detailed explanations
- Check `rename-mapping.json` for specific path mappings
- Review `rename-checklist.md` for complete file list

---

**Ready to start?** Choose your path above and follow the steps!

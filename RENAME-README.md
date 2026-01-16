# File Renaming Helper Files

This directory contains helper files for renaming all project files from PascalCase to kebab-case.

## Quick Start

**Recommended**: Use your IDE's built-in refactoring

1. Open `RENAME-SUMMARY.md` - Start here for overview
2. Follow `RENAMING-GUIDE.md` - Detailed step-by-step guide
3. Use `rename-checklist.md` - Track your progress

## Available Files

### Documentation

| File | Purpose |
|------|---------|
| `RENAME-SUMMARY.md` | Quick overview and status |
| `RENAMING-GUIDE.md` | Complete step-by-step guide |
| `rename-checklist.md` | Interactive checklist for manual renaming |

### Reference

| File | Purpose |
|------|---------|
| `rename-mapping.json` | Structured mapping of all old → new paths |

### Automation Scripts

| File | Language | Purpose |
|------|----------|---------|
| `auto-rename.sh` | Bash | Rename files with git mv (no import updates) |
| `update-imports.py` | Python 3 | Update all import statements (recommended) |
| `update-imports.js` | Node.js | Generate import update worker script |
| `verify-kebab-case.sh` | Bash | Verify all files are renamed correctly |

## Recommended Workflow

### Option A: IDE Refactoring (Safest)

```bash
# 1. Read the summary
cat RENAME-SUMMARY.md

# 2. Follow the guide
cat RENAMING-GUIDE.md

# 3. Use your IDE to rename each file
#    VS Code: Right-click → Rename File → Accept "Update imports"
#    WebStorm: Right-click → Refactor → Rename

# 4. Verify completion
chmod +x verify-kebab-case.sh
./verify-kebab-case.sh
```

### Option B: Semi-Automated

```bash
# 1. Rename all files
chmod +x auto-rename.sh
./auto-rename.sh

# 2. Update imports (Python - recommended)
python3 update-imports.py

# OR update imports (Node.js)
npm install glob
node update-imports.js
node update-imports-worker.js

# 3. Verify
chmod +x verify-kebab-case.sh
./verify-kebab-case.sh

# 4. Test
npm run type-check
npm run build
```

## What Gets Renamed?

- **85 files total** from PascalCase to kebab-case
- **3 special renames** that also drop suffixes:
  - `MainViewCopy.tsx` → `main-view.tsx`
  - `OnboardingChatV2.tsx` → `onboarding-chat.tsx`
  - `BronzeCardV2.tsx` → `bronze-card.tsx`

## File Locations

Files across these directories will be renamed:

- `src/` - Root files (App.tsx)
- `src/components/` - UI components and pages
- `src/contexts/` - Context providers
- `src/features/*/components/` - Feature components
- `src/features/*/hooks/` - Feature hooks
- `src/hooks/` - Global hooks
- `src/pages/` - Page components
- `src/services/` - Service files
- `src/utils/` - Utility files

## Verification

After renaming, verify success:

```bash
# Should output: ✅ Success!
./verify-kebab-case.sh

# Should have no errors
npm run type-check

# Should build successfully
npm run build
```

## Troubleshooting

### Imports still broken after renaming?

```bash
# Run Python import updater
python3 update-imports.py

# Or manually find broken imports
npm run type-check 2>&1 | grep "Cannot find module"
```

### Git shows deletes instead of renames?

```bash
git add -A
git status  # Should now show renames
```

### Build cache issues?

```bash
rm -rf dist/ node_modules/.vite/
npm run build
```

## Clean Up

After successful renaming and committing, you can delete these helper files:

```bash
rm RENAME-*.md
rm rename-*.{md,json}
rm auto-rename.sh
rm update-imports.{js,py}
rm update-imports-worker.js  # If generated
rm verify-kebab-case.sh
```

## Questions?

1. Start with `RENAME-SUMMARY.md`
2. Read `RENAMING-GUIDE.md` for detailed help
3. Check `rename-mapping.json` for specific path mappings
4. Use `verify-kebab-case.sh` to see what remains

---

**Ready?** Start with `RENAME-SUMMARY.md`!

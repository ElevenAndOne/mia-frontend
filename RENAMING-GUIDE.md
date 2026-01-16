# File Renaming Guide: PascalCase → kebab-case

This guide helps you rename all files from PascalCase to kebab-case per the project's `agents.md` specification.

## Quick Start

### Option 1: Use IDE Refactoring (RECOMMENDED)

This is the safest and most reliable method:

1. Open the project in VS Code, WebStorm, or your preferred IDE
2. Use `rename-checklist.md` as your guide
3. For each file:
   - Right-click the file → "Rename File"
   - Enter the new kebab-case name
   - IDE will automatically update all imports
4. After all renames, verify with: `./verify-kebab-case.sh`

### Option 2: Automated Script (Advanced)

If you prefer automation:

```bash
# 1. Make scripts executable
chmod +x auto-rename.sh verify-kebab-case.sh

# 2. Run the rename script (renames files only, NOT imports)
./auto-rename.sh

# 3. Update imports (requires node and glob package)
npm install glob
node update-imports.js
node update-imports-worker.js

# 4. Verify everything worked
./verify-kebab-case.sh

# 5. Check for broken imports
npm run type-check
npm run build
```

## Files Overview

Total files to rename: **85**

### Special Renames (Name Changes)

These files need special attention:

| Old Name | New Name | Note |
|----------|----------|------|
| `MainViewCopy.tsx` | `main-view.tsx` | Drop "Copy" suffix |
| `OnboardingChatV2.tsx` | `onboarding-chat.tsx` | Drop "V2" suffix |
| `BronzeCardV2.tsx` | `bronze-card.tsx` | Drop "V2" suffix |

### Breakdown by Directory

- **Root**: 1 file
- **Components**: 35 files
- **Component Tests**: 2 files
- **Contexts**: 2 files
- **Context Tests**: 1 file
- **Features**: 18 files
- **Hooks**: 9 files
- **Pages**: 3 files
- **Services**: 2 files
- **Utils**: 1 file

## Detailed Instructions

### Step 1: Prepare

```bash
cd /Users/Craig/Developer/Projects/mia-frontend

# Review what needs to be renamed
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -name "*[A-Z]*" | grep -v node_modules

# Make verification script executable
chmod +x verify-kebab-case.sh
```

### Step 2: Rename Files

#### Using IDE (VS Code Example)

1. Open the project in VS Code
2. Open the file explorer (Cmd+Shift+E)
3. For each file in `rename-checklist.md`:
   - Right-click the file
   - Select "Rename..."
   - Type the new kebab-case name
   - Press Enter
   - VS Code will ask "Would you like to update imports?" → Click "Yes"

#### Using WebStorm/IntelliJ

1. Open the project
2. For each file:
   - Right-click the file
   - Select "Refactor" → "Rename"
   - Enter new name
   - Click "Refactor"
   - IDE automatically updates all references

### Step 3: Verify

```bash
# Check for remaining PascalCase files
./verify-kebab-case.sh

# Should output: "✅ Success! All TypeScript files are now in kebab-case."
```

### Step 4: Test

```bash
# Type check
npm run type-check

# Build
npm run build

# If you have tests
npm test

# If you have linting
npm run lint
```

## Import Update Patterns

The renaming will affect these import patterns:

### Before
```typescript
import App from './App'
import { SessionProvider } from './contexts/SessionContext'
import { useAppRouter } from './hooks/useAppRouter'
import MainViewCopy from './components/MainViewCopy'
```

### After
```typescript
import App from './app'
import { SessionProvider } from './contexts/session-context'
import { useAppRouter } from './hooks/use-app-router'
import MainView from './components/main-view'
```

## Common Issues & Solutions

### Issue: "Cannot find module"

**Cause**: Import statement wasn't updated

**Solution**:
```bash
# Search for the old import
grep -r "from './OldFileName'" src/

# Update manually or re-run IDE refactoring
```

### Issue: Build fails after renaming

**Cause**: Case-sensitive imports on some systems

**Solution**:
```bash
# Clear build cache
rm -rf dist/
rm -rf node_modules/.vite/

# Rebuild
npm run build
```

### Issue: Git shows deleted and new file instead of rename

**Cause**: Used `mv` instead of `git mv`

**Solution**:
```bash
# Git should detect renames automatically if similarity > 50%
git add -A
git status  # Should show "renamed: OldName.tsx -> new-name.tsx"
```

## Reference Files

- `rename-checklist.md` - Complete checklist of all files to rename
- `rename-mapping.json` - Structured mapping of old → new paths
- `auto-rename.sh` - Automated rename script (git mv only)
- `update-imports.js` - Generate import update script
- `verify-kebab-case.sh` - Verify all renames complete

## Validation Checklist

After completing all renames:

- [ ] All files are in kebab-case: `./verify-kebab-case.sh`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm test` (if applicable)
- [ ] Lint passes: `npm run lint` (if applicable)
- [ ] Git status shows renames (not delete+add): `git status`
- [ ] No remaining PascalCase in imports: `grep -r "from './[A-Z]" src/` returns nothing

## Git Commit

After successful renaming and verification:

```bash
# Review changes
git status

# Stage all renames
git add -A

# Commit with descriptive message
git commit -m "refactor: Rename all files to kebab-case per agents.md spec

- Convert all PascalCase filenames to kebab-case
- Remove legacy suffixes (Copy, V2)
- Update all import statements
- Total files renamed: 85

Follows naming convention specified in agents.md"
```

## Rollback

If something goes wrong:

```bash
# Before committing
git restore .
git clean -fd

# After committing
git revert HEAD
```

## Need Help?

1. Check `rename-checklist.md` for the complete list
2. Check `rename-mapping.json` for exact mappings
3. Run `./verify-kebab-case.sh` to see what's remaining
4. Use your IDE's "Find in Files" to locate broken imports

## Notes

- File renames preserve git history when using `git mv`
- IDE refactoring is the safest method
- Always verify with type-check and build
- Update your `.vscode/settings.json` if you have file-specific configs
- Update any scripts or configs that reference old filenames

# Rename Summary - Ready to Execute

## Current Status

**Files awaiting rename**: 85 TypeScript files
**Current naming**: Mix of PascalCase and kebab-case
**Target naming**: All kebab-case (per `agents.md`)

## What Has Been Prepared

I've created the following helper files in your project root:

### 1. **RENAMING-GUIDE.md**
Complete guide with step-by-step instructions for both IDE and automated approaches.

### 2. **rename-checklist.md**
Interactive checklist of all 85 files to rename, organized by directory.
Use this to track your progress as you rename files in your IDE.

### 3. **rename-mapping.json**
Structured JSON mapping of every old path → new path.
Useful for automated scripts or reference.

### 4. **auto-rename.sh**
Automated bash script that uses `git mv` to rename all files.
⚠️ Only renames files - does NOT update imports!

### 5. **update-imports.js**
Node script generator for updating import statements after renaming.
Creates `update-imports-worker.js` which performs the actual updates.

### 6. **verify-kebab-case.sh**
Verification script to check if all files have been renamed correctly.
Run this after completing renames to confirm success.

## Recommended Approach

### For VS Code Users (RECOMMENDED)

```bash
# 1. Open the project in VS Code
code /Users/Craig/Developer/Projects/mia-frontend

# 2. Open rename-checklist.md side-by-side with the file explorer

# 3. For each file in the checklist:
#    - Right-click file in explorer → "Rename"
#    - Enter new kebab-case name
#    - Accept "Update imports" prompt
#    - Check off item in checklist

# 4. Verify completion
chmod +x verify-kebab-case.sh
./verify-kebab-case.sh

# 5. Test everything
npm run type-check
npm run build
```

### For Command Line Users

```bash
# 1. Make scripts executable
chmod +x auto-rename.sh verify-kebab-case.sh

# 2. Run automated rename
./auto-rename.sh

# 3. Update imports
npm install glob  # If not installed
node update-imports.js
node update-imports-worker.js

# 4. Verify
./verify-kebab-case.sh

# 5. Test
npm run type-check
npm run build
```

## Special Attention Required

These 3 files are being renamed AND simplified:

1. **MainViewCopy.tsx** → **main-view.tsx**
   - Location: `src/components/`
   - Change: Removes "Copy" suffix
   - Imports to update: Any component importing MainViewCopy

2. **OnboardingChatV2.tsx** → **onboarding-chat.tsx**
   - Location: `src/components/`
   - Change: Removes "V2" suffix
   - Imports to update: Any component importing OnboardingChatV2

3. **BronzeCardV2.tsx** → **bronze-card.tsx**
   - Location: `src/features/onboarding/components/`
   - Change: Removes "V2" suffix
   - Imports to update: Check onboarding components

## File Categories

### Screens/Pages (9 files)
Located in `src/components/`:
- AccountSelectionPage, MetaAccountSelectionPage, MainViewCopy
- IntegrationsPage, OnboardingChatV2, WorkspaceSettingsPage
- InviteLandingPage, CombinedAccountSelection, VideoIntroView

### UI Components (7 files)
Located in `src/components/`:
- LoadingScreen, DateRangeSelector, MicroCelebration
- FigmaLoginModal, BronzeFactCard, TypingMessage
- OnboardingProgressBar

### Other Components (19 files)
Various selectors, modals, and streaming components in `src/components/`

### Contexts (3 files)
- src/contexts/SessionContext.tsx
- src/contexts/OnboardingContext.tsx
- src/contexts/__tests__/SessionContext.test.tsx

### Feature Components (12 files)
Across features/accounts, features/chat, features/insights, features/integrations, features/onboarding, features/workspaces

### Hooks (20 files total)
- src/hooks/: 9 files (useAppRouter, useIntegrationStatus, etc.)
- features/*/hooks/: 11 files across different features

### Pages (3 files)
- src/pages/docs/DocsLayout.tsx
- src/pages/docs/IntegrationGuidePage.tsx
- src/pages/docs/VideoTutorialPage.tsx

### Services (2 files)
- src/services/accountService.ts
- src/services/metaAds.ts

### Utils (1 file)
- src/utils/clearMetaAuth.ts

### Root (1 file)
- src/App.tsx

## Validation Steps

After renaming, run these commands in order:

```bash
# 1. Verify all files renamed
./verify-kebab-case.sh
# Expected: ✅ Success! All TypeScript files are now in kebab-case.

# 2. Check TypeScript compilation
npm run type-check
# Expected: No errors

# 3. Build the project
npm run build
# Expected: Build succeeds

# 4. Check for old import patterns
grep -r "from './[A-Z]" src/ || echo "✅ No PascalCase imports found"
grep -r 'from "./[A-Z]' src/ || echo "✅ No PascalCase imports found"

# 5. Search for specific old names (should return nothing)
grep -r "MainViewCopy" src/ || echo "✅ MainViewCopy fully renamed"
grep -r "OnboardingChatV2" src/ || echo "✅ OnboardingChatV2 fully renamed"
grep -r "BronzeCardV2" src/ || echo "✅ BronzeCardV2 fully renamed"
```

## Git Workflow

```bash
# Review all changes
git status

# Should show renames, not deletions+additions
# Example: renamed: src/App.tsx -> src/app.tsx

# Stage everything
git add -A

# Commit with descriptive message
git commit -m "refactor: Rename all files to kebab-case per agents.md

- Convert 85 files from PascalCase to kebab-case
- Remove legacy suffixes (Copy, V2)
- Update all import statements
- Follows naming convention in agents.md"

# Verify commit
git show --stat
```

## Troubleshooting

### If build fails

```bash
# Clear caches
rm -rf dist/ node_modules/.vite/

# Rebuild
npm install
npm run build
```

### If imports are broken

```bash
# Find all broken imports
npm run type-check 2>&1 | grep "Cannot find module"

# Fix manually or re-run update-imports-worker.js
```

### If git shows delete+add instead of rename

```bash
# Reset
git reset HEAD .

# Re-add with rename detection
git add -A
git status  # Should now show renames
```

## Next Steps

1. Choose your approach (IDE or automated)
2. Follow the steps in RENAMING-GUIDE.md
3. Use rename-checklist.md to track progress
4. Verify with verify-kebab-case.sh
5. Test with npm run type-check && npm run build
6. Commit changes

## Questions?

- Review RENAMING-GUIDE.md for detailed instructions
- Check rename-mapping.json for exact path mappings
- Run verify-kebab-case.sh to see remaining files

---

**Ready to start?** Open RENAMING-GUIDE.md and choose your preferred method!

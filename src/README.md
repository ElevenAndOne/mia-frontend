# Mia Frontend Architecture

This document describes the folder structure and architectural patterns used in the Mia frontend application.

## Table of Contents

- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Path Aliases](#path-aliases)
- [Import Patterns](#import-patterns)
- [Feature Architecture](#feature-architecture)
- [Best Practices](#best-practices)

## Overview

The Mia frontend follows a **feature-based architecture** with clear separation of concerns. Each feature is self-contained with its own components, hooks, types, and business logic.

## Folder Structure

```
src/
├── features/           # Feature modules (domain-specific)
│   ├── accounts/
│   │   ├── components/    # Account-related components
│   │   │   ├── AccountSwitcher.tsx
│   │   │   └── index.ts   # Barrel export
│   │   └── hooks/         # Account-related hooks
│   ├── auth/
│   │   ├── components/
│   │   └── hooks/
│   ├── chat/
│   │   ├── components/
│   │   └── hooks/
│   ├── insights/
│   │   ├── components/
│   │   └── hooks/
│   ├── integrations/
│   │   ├── components/
│   │   └── hooks/
│   ├── onboarding/
│   │   ├── components/
│   │   └── hooks/
│   └── workspaces/
│       ├── components/
│       └── hooks/
│
├── screens/            # Top-level page components
│   ├── DashboardScreen.tsx
│   ├── OnboardingScreen.tsx
│   └── ...
│
├── components/         # Shared/legacy components
│   ├── shared/         # Truly shared components
│   └── ui/            # UI primitives (empty - for future)
│
├── hooks/             # Global/shared hooks
│   ├── use-mobile.tsx
│   └── ...
│
├── contexts/          # React contexts
│   ├── SessionContext.tsx
│   ├── OnboardingContext.tsx
│   └── ...
│
├── services/          # API clients and services
│   ├── accountService.ts
│   ├── api-client.ts
│   ├── auth-service.ts
│   ├── integration-service.ts
│   ├── metaAds.ts
│   ├── workspace-service.ts
│   └── index.ts       # Barrel export
│
├── types/             # TypeScript type definitions
│   ├── index.ts
│   └── ...
│
├── utils/             # Utility functions
│   ├── api.ts
│   ├── storage.ts
│   └── ...
│
├── lib/               # Third-party library configs
│
├── assets/            # Static assets
│   └── ...
│
└── styles/            # Global styles
    └── index.css
```

## Path Aliases

The following path aliases are configured in `tsconfig.json` and `vite.config.ts`:

| Alias | Path | Description |
|-------|------|-------------|
| `@/*` | `src/*` | Root src directory |
| `@features/*` | `src/features/*` | Feature modules |
| `@screens/*` | `src/screens/*` | Screen/page components |
| `@components/*` | `src/components/*` | Shared components |
| `@hooks/*` | `src/hooks/*` | Global hooks |
| `@services/*` | `src/services/*` | API services |
| `@types/*` | `src/types/*` | Type definitions |
| `@utils/*` | `src/utils/*` | Utility functions |
| `@contexts/*` | `src/contexts/*` | React contexts |
| `@lib/*` | `src/lib/*` | Library configs |
| `@assets/*` | `src/assets/*` | Static assets |
| `@styles/*` | `src/styles/*` | Global styles |

## Import Patterns

### Feature Components

Use barrel exports for cleaner imports:

```typescript
// ✅ Good - Using barrel export
import { AccountSwitcher } from '@features/accounts/components'
import { ChatPanel } from '@features/chat/components'
import { InviteList, MemberList } from '@features/workspaces/components'

// ❌ Avoid - Direct file imports
import AccountSwitcher from '@features/accounts/components/AccountSwitcher'
```

### Feature Hooks

```typescript
// ✅ Good - Using barrel export
import { useWorkspaceMembers, useWorkspaceInvites } from '@features/workspaces/hooks'
import { useIntegrationModals } from '@features/integrations/hooks'

// ❌ Avoid - Direct file imports
import { useWorkspaceMembers } from '@features/workspaces/hooks/useWorkspaceMembers'
```

### Services

```typescript
// ✅ Good - Using barrel export
import { authService, ApiError, apiRequest } from '@services'

// ❌ Avoid - Direct imports
import { authService } from '@services/auth-service'
import { ApiError } from '@services/api-client'
```

### Contexts

```typescript
// Good - Direct context imports
import { useSession } from '@contexts/SessionContext'
import { useOnboarding } from '@contexts/OnboardingContext'
```

### Types

```typescript
// Good - Importing types
import type { SessionResponse } from '@types'
import type { Member, Invite } from '@features/workspaces/hooks'
```

## Feature Architecture

### Feature Module Structure

Each feature follows this structure:

```
features/[feature-name]/
├── components/           # Feature-specific components
│   ├── Component1.tsx
│   ├── Component2.tsx
│   └── index.ts         # Barrel export
├── hooks/               # Feature-specific hooks
│   ├── useFeature1.ts
│   ├── useFeature2.ts
│   └── index.ts         # Barrel export
└── types/               # Feature-specific types (optional)
    └── index.ts
```

### Barrel Export Pattern

Each `components/` and `hooks/` folder should have an `index.ts` that exports all public members:

**Example: `features/integrations/components/index.ts`**
```typescript
export { default as PlatformCard } from './PlatformCard'
export type { PlatformCardProps } from './PlatformCard'

export { default as ConnectionModals } from './ConnectionModals'
export type { ConnectionModalsProps } from './ConnectionModals'
```

**Example: `features/workspaces/hooks/index.ts`**
```typescript
export { useWorkspaceMembers } from './useWorkspaceMembers'
export type { Member } from './useWorkspaceMembers'

export { useWorkspaceInvites } from './useWorkspaceInvites'
export type { Invite } from './useWorkspaceInvites'
```

## Best Practices

### 1. Feature Isolation

- Keep feature code self-contained within its feature folder
- Features should not import from other features
- Share common functionality via `hooks/`, `utils/`, or `services/`

### 2. Component Organization

- **Feature Components**: Live in `features/[feature]/components/`
- **Screen Components**: Live in `screens/`
- **Shared Components**: Live in `components/shared/`
- **UI Primitives**: Live in `components/ui/` (for shadcn/ui or similar)

### 3. Hook Organization

- **Feature Hooks**: Live in `features/[feature]/hooks/`
- **Global Hooks**: Live in `hooks/`
- Name hooks with `use` prefix: `useWorkspaceMembers`, `useOnboardingFlow`

### 4. Service Layer

- All API calls go through services in `services/`
- Services export typed functions and error classes
- Use the `apiFetch` utility for authenticated requests

### 5. Type Safety

- Export types alongside their components/hooks
- Use TypeScript's `type` keyword for type-only imports
- Define interfaces for component props

### 6. Context Usage

- Contexts live in `contexts/`
- Use contexts for global state (session, auth, theme, etc.)
- Avoid prop drilling with contexts

### 7. Import Order

Organize imports in this order:

```typescript
// 1. React imports
import { useState, useEffect } from 'react'

// 2. Third-party imports
import { motion } from 'framer-motion'

// 3. Absolute imports (using aliases)
import { useSession } from '@contexts/SessionContext'
import { AccountSwitcher } from '@features/accounts/components'
import { apiRequest } from '@services'

// 4. Relative imports (same feature)
import { useFeatureLogic } from './useFeatureLogic'
import type { LocalType } from './types'
```

## Migration Notes

This architecture was established through a comprehensive refactoring to:

1. **Consolidate scattered components** into feature-based modules
2. **Add barrel exports** for cleaner imports
3. **Configure path aliases** for better developer experience
4. **Remove unused dependencies** (three.js, lottie-react)
5. **Establish patterns** for future development

### What Changed

- Components moved from `components/` to `features/[feature]/components/`
- Hooks moved from `hooks/` to `features/[feature]/hooks/`
- Added barrel exports (`index.ts`) to all feature folders
- Updated path aliases in `tsconfig.json` and `vite.config.ts`
- Removed unused dependencies

### Backward Compatibility

Legacy components in `components/` are still supported but should gradually be:
- Migrated to appropriate feature folders, OR
- Moved to `components/shared/` if truly shared across features

## Questions?

If you're unsure where something belongs:

1. **Is it domain-specific?** → Put it in the appropriate `features/` folder
2. **Is it a page/route?** → Put it in `screens/`
3. **Is it shared across multiple features?** → Put it in `components/shared/` or `hooks/`
4. **Is it an API call?** → Put it in `services/`
5. **Is it a utility function?** → Put it in `utils/`

When in doubt, prefer feature-specific organization over generic shared folders.

# UI Component Library

This document provides comprehensive documentation for all reusable UI components in the application.

## Button Components

### Button

The unified Button component provides consistent styling and behavior across the application.

#### Import

```tsx
import { Button, ButtonBlack, ButtonOrange, ButtonGreen } from '@/components/ui'
```

#### Variants

- **primary**: Blue solid background (default) - Use for main actions
- **secondary**: Gray background - Use for cancel/alternative actions
- **danger**: Red background - Use for destructive actions
- **outline**: Bordered with no background - Use for secondary actions
- **ghost**: No background, minimal styling - Use for tertiary actions
- **link**: Text-only, link-style button - Use for navigation

#### Sizes

- **sm**: Small (text-sm, px-3 py-2)
- **md**: Medium (text-sm, px-4 py-2.5) - default
- **lg**: Large (text-base, px-6 py-3)

#### Props

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline-solid' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
  // ...all standard button HTML attributes
}
```

#### Basic Usage

```tsx
// Primary button (blue)
<Button variant="primary" onClick={handleSubmit}>
  Submit
</Button>

// Secondary button
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Danger button (destructive action)
<Button variant="danger" onClick={handleDelete}>
  Delete Account
</Button>

// Outline button
<Button variant="outline">
  Learn More
</Button>

// Ghost button (minimal)
<Button variant="ghost">
  Skip
</Button>

// Link button
<Button variant="link" onClick={() => navigate('/help')}>
  Need help?
</Button>
```

#### With Icons

```tsx
// Left icon
<Button
  leftIcon={
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  }
>
  Add Item
</Button>

// Right icon
<Button
  rightIcon={
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
    </svg>
  }
>
  Next
</Button>
```

#### Loading State

```tsx
<Button isLoading={isSubmitting} disabled={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save Changes'}
</Button>
```

#### Full Width

```tsx
<Button fullWidth variant="primary">
  Continue
</Button>
```

#### Sizes

```tsx
<Button size="sm">Small Button</Button>
<Button size="md">Medium Button</Button>
<Button size="lg">Large Button</Button>
```

#### Color Variants

```tsx
// Black button (for landing pages, onboarding)
import { ButtonBlack } from '@/components/ui'

<ButtonBlack onClick={handleStart}>
  Get Started
</ButtonBlack>

// Orange button (for special actions like GA4)
import { ButtonOrange } from '@/components/ui'

<ButtonOrange onClick={handleConnect}>
  Connect Property
</ButtonOrange>

// Green button (for success actions)
import { ButtonGreen } from '@/components/ui'

<ButtonGreen onClick={handleConfirm}>
  Confirm
</ButtonGreen>
```

#### Modal Actions Pattern

```tsx
// Common pattern: Cancel + Primary action
<div className="flex gap-3">
  <Button variant="outline" onClick={onClose} className="flex-1">
    Cancel
  </Button>
  <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} className="flex-1">
    {isSubmitting ? 'Saving...' : 'Save'}
  </Button>
</div>
```

---

### IconButton

Icon-only button for compact actions.

#### Import

```tsx
import { IconButton } from '@/components/ui'
```

#### Variants

- **default**: Gray text with gray hover background
- **danger**: Red text with red hover background
- **ghost**: Minimal hover effect

#### Sizes

- **sm**: 32x32 (p-2)
- **md**: 36x36 (p-2.5) - default
- **lg**: 40x40 (p-3)

#### Rounded

- **default**: rounded-lg
- **full**: rounded-full (circular)

#### Props

```tsx
interface IconButtonProps {
  icon: ReactNode
  variant?: 'default' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'default' | 'full'
  'aria-label': string // Required for accessibility
  // ...all standard button HTML attributes
}
```

#### Usage

```tsx
// Copy button
<IconButton
  onClick={handleCopy}
  aria-label="Copy to clipboard"
  icon={
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  }
/>

// Delete button (danger)
<IconButton
  onClick={handleDelete}
  variant="danger"
  aria-label="Delete item"
  icon={
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  }
/>

// Close button (circular)
<IconButton
  onClick={onClose}
  rounded="full"
  aria-label="Close"
  icon={
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  }
/>
```

---

### ToggleButtonGroup

Component for mutually exclusive options with toggle buttons.

#### Import

```tsx
import { ToggleButtonGroup, ToggleButtonGroupBlack } from '@/components/ui'
```

#### Props

```tsx
interface ToggleOption<T extends string = string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

interface ToggleButtonGroupProps<T extends string = string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  fullWidth?: boolean
  size?: 'sm' | 'md'
  className?: string
}
```

#### Usage

```tsx
// Basic toggle (gray selection)
<ToggleButtonGroup
  options={[
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ]}
  value={period}
  onChange={setPeriod}
/>

// Full width toggle
<ToggleButtonGroup
  options={[
    { value: 'grid', label: 'Grid View' },
    { value: 'list', label: 'List View' },
  ]}
  value={viewMode}
  onChange={setViewMode}
  fullWidth
/>

// With icons
<ToggleButtonGroup
  options={[
    {
      value: 'card',
      label: 'Cards',
      icon: <GridIcon className="w-4 h-4" />
    },
    {
      value: 'table',
      label: 'Table',
      icon: <TableIcon className="w-4 h-4" />
    },
  ]}
  value={displayMode}
  onChange={setDisplayMode}
/>

// Black variant (for invites, high-contrast)
<ToggleButtonGroupBlack
  options={[
    { value: 'link', label: 'Anyone with link' },
    { value: 'email', label: 'Specific email' },
  ]}
  value={inviteType}
  onChange={setInviteType}
  fullWidth
/>
```

---

## Migration Guide

### Replacing Old Button Code

#### Before

```tsx
<button
  onClick={handleSubmit}
  disabled={isLoading}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isLoading ? 'Submitting...' : 'Submit'}
</button>
```

#### After

```tsx
<Button
  onClick={handleSubmit}
  disabled={isLoading}
  isLoading={isLoading}
>
  {isLoading ? 'Submitting...' : 'Submit'}
</Button>
```

---

### Replacing Icon Buttons

#### Before

```tsx
<button
  onClick={handleDelete}
  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
>
  <TrashIcon className="w-4 h-4" />
</button>
```

#### After

```tsx
<IconButton
  onClick={handleDelete}
  variant="danger"
  aria-label="Delete"
  icon={<TrashIcon className="w-4 h-4" />}
/>
```

---

### Replacing Toggle Buttons

#### Before

```tsx
<div className="flex gap-2">
  <button
    onClick={() => setView('list')}
    className={`flex-1 py-2 px-3 rounded-lg ${
      view === 'list' ? 'bg-black text-white' : 'bg-white border border-gray-200'
    }`}
  >
    List
  </button>
  <button
    onClick={() => setView('grid')}
    className={`flex-1 py-2 px-3 rounded-lg ${
      view === 'grid' ? 'bg-black text-white' : 'bg-white border border-gray-200'
    }`}
  >
    Grid
  </button>
</div>
```

#### After

```tsx
<ToggleButtonGroupBlack
  options={[
    { value: 'list', label: 'List' },
    { value: 'grid', label: 'Grid' },
  ]}
  value={view}
  onChange={setView}
  fullWidth
/>
```

---

## Design Principles

1. **Consistency**: All buttons use the same base styles (rounded-lg, transitions, disabled states)
2. **Accessibility**: Required aria-labels for icon buttons, proper focus states
3. **Flexibility**: Support for icons, loading states, and custom styling via className prop
4. **Type Safety**: Full TypeScript support with proper types
5. **Performance**: Optimized with forwardRef and proper React patterns

---

## Common Patterns

### Modal Footer with Actions

```tsx
<div className="flex gap-3">
  <Button variant="outline" onClick={onClose} className="flex-1">
    Cancel
  </Button>
  <Button onClick={handleSubmit} isLoading={isSubmitting} className="flex-1">
    {isSubmitting ? 'Saving...' : 'Save'}
  </Button>
</div>
```

### Inline Actions (Copy, Delete)

```tsx
<div className="flex items-center gap-2">
  <IconButton
    onClick={handleCopy}
    aria-label="Copy"
    icon={<CopyIcon />}
  />
  <IconButton
    onClick={handleDelete}
    variant="danger"
    aria-label="Delete"
    icon={<TrashIcon />}
  />
</div>
```

### Full Width Primary Action

```tsx
<ButtonBlack fullWidth size="lg" onClick={handleStart}>
  Get Started
</ButtonBlack>
```

### Loading Button

```tsx
<Button isLoading={isProcessing} disabled={isProcessing}>
  {isProcessing ? 'Processing...' : 'Process Payment'}
</Button>
```

---

## Benefits of Using These Components

1. **Reduced Code Duplication**: ~300-400 lines of CSS saved across the codebase
2. **Consistent UX**: All buttons behave and look the same
3. **Easier Maintenance**: Change styles in one place
4. **Better Accessibility**: Built-in aria-labels and keyboard support
5. **Type Safety**: TypeScript catches errors at compile time
6. **Loading States**: Built-in spinner and disabled state handling

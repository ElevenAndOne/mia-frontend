# Component Architecture Documentation

This document outlines the refactored component architecture using React composition patterns and providers.

## **Providers (State Management)**

### Core Providers
1. **SdkProvider** - Provides SDK instance for API calls
2. **SessionProvider** - Manages user authentication and session state
3. **UIStateProvider** - Manages global UI state (modals, loading, notifications)
4. **ChatProvider** - Manages chat sessions and messaging state across categories

### Provider Wrapper
- **AppProviders** - Wraps all providers in the correct order

## **Base UI Components** (`/src/components/ui/`)

### Core UI Building Blocks
1. **Button** - Reusable button with variants (primary, secondary, ghost, danger)
   - Props: variant, size, loading, disabled, icon, fullWidth
   - Used in: All pages, modals, forms

2. **Modal** - Reusable modal with animations and accessibility
   - Props: isOpen, onClose, title, size, showCloseButton
   - Used in: Date picker, confirmations, forms

3. **LoadingSpinner** - Loading indicator with different sizes and colors
   - Props: size, color, text, centered
   - Used in: All loading states, buttons, overlays

4. **ErrorState** - Error display with retry functionality
   - Props: title, message, onRetry, showRetry
   - Used in: Page errors, data fetch failures

## **Common Components** (`/src/components/common/`)

### Shared UI Patterns
1. **AccountSelector** - Account switching dropdown
   - Props: isOpen, onClose, onAccountSelect
   - Used in: Page headers, navigation

2. **PageHeader** - Standard page header with navigation
   - Props: title, subtitle, onBack, showAccountInfo, showLogout
   - Used in: All main pages

3. **NavigationTabs** - Tab navigation with animations
   - Props: tabs, activeTab, onTabChange, variant
   - Used in: Analytics pages, multi-category views

## **Layout Components** (`/src/components/layout/`)

### Page Structure Components
1. **PageLayout** - Base page layout with header and error handling
   - Props: loading, error, onRetry, showHeader
   - Used in: All pages as base wrapper

2. **SidebarLayout** - Layout with sidebar for complex pages
   - Props: sidebar, sidebarWidth, sidebarPosition
   - Used in: Dashboard-style pages

3. **CenteredLayout** - Centered content layout for forms/auth
   - Props: maxWidth, showBackground
   - Used in: Login, setup pages

4. **AnalyticsLayout** - Specialized layout for analytics pages
   - Props: categories, activeCategory, onCategoryChange, onQuestionSelect
   - Used in: Creative, Growth, Optimize, Protect pages

## **Chat Components** (`/src/components/chat/`)

### Messaging and Question System
1. **ChatInterface** - Chat UI with messages and typing indicators
   - Props: category, className, showTypingIndicator
   - Used in: All analytics pages

2. **QuestionGrid** - Grid of preset questions with visual feedback
   - Props: questions, category, onQuestionSelect, columns
   - Used in: Analytics pages for question selection

## **Refactored Page Components**

### Main Application Pages
1. **CreativePage** - Refactored using AnalyticsLayout
   - Uses: ChatProvider, UIStateProvider, SessionProvider
   - Features: Date picker, account switching, question flow

2. **OptimizePage** - Refactored using PageLayout  
   - Uses: UIStateProvider, SessionProvider, SdkProvider
   - Features: Data visualization, error handling, retry logic

3. **GrowthPage** - (To be refactored similarly)
4. **ProtectPage** - (To be refactored similarly)
5. **IntegrationsPage** - (Can be refactored to use new components)

## **Component Usage Patterns**

### When to Create a Component
✅ **Create a component when:**
- UI pattern is used more than once
- Component has complex state or logic
- Different props are passed for different use cases
- Component needs to be tested independently

### Provider Usage
✅ **Use providers when:**
- State needs to be shared across multiple components
- State management logic is complex
- Multiple components need access to the same data

## **Component Composition Examples**

### Basic Page Structure
```jsx
<AppProviders>
  <PageLayout title="My Page" onBack={handleBack}>
    <div className="container">
      {/* Page content */}
    </div>
  </PageLayout>
</AppProviders>
```

### Analytics Page Structure  
```jsx
<AppProviders>
  <AnalyticsLayout
    categories={['grow', 'optimize', 'protect']}
    activeCategory={activeCategory}
    onCategoryChange={setActiveCategory}
    onQuestionSelect={handleQuestionSelect}
  />
</AppProviders>
```

### Modal with Form
```jsx
<Modal isOpen={isOpen} onClose={onClose} title="Settings">
  <form>
    <Button variant="primary" type="submit" loading={isSubmitting}>
      Save Changes
    </Button>
  </form>
</Modal>
```

## **Benefits of This Architecture**

### 🎯 **Reusability**
- Components can be used across multiple pages
- Consistent UI/UX patterns
- Easy to maintain and update

### 🔧 **Maintainability** 
- Clear separation of concerns
- Provider pattern for state management
- Composition over large monolithic components

### 🧪 **Testability**
- Small, focused components are easier to test
- Providers can be mocked for isolated testing
- Clear component boundaries

### 📈 **Scalability**
- Easy to add new pages using existing components
- Provider pattern scales well with app complexity
- Component library approach

## **Migration Guide**

### For Existing Components
1. Identify repeated UI patterns
2. Extract into reusable components
3. Use providers for shared state
4. Refactor large components using composition
5. Update imports to use new component structure

### Next Steps
- Refactor remaining large components (GrowthPage, ProtectPage)
- Add more specialized components as needed
- Consider adding component documentation/Storybook
- Add comprehensive testing for new component architecture

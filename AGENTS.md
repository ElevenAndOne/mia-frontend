# AGENTS.md

## Purpose

This file is the non-negotiable source of truth for how AI agents create, modify, and extend this codebase. If a rule below conflicts with an idea or preference, the rule wins.

## Stack

- React 19.2
- TypeScript
- Vite
- Tailwind CSS v4

## Core principles (enforced)

- Keep things simple and readable.
- Prefer clear structure over clever abstractions.
- Follow existing patterns before introducing new ones.
- Do not add new libraries without strong justification and explicit approval.

## Mandatory workflow before adding UI or logic

You must do all of the following before creating any new component, hook, or utility:

1) Search for prior art in these locations:
- `src/components`
- `src/features/**/components`
- `src/features/**/hooks`
- `src/features/**/utils`
- `src/utils`
- `src/contexts`

2) Search by both behavior and labels. Use `rg` for:
- Existing component names or similar UI labels (button text, section titles, menu items)
- Behavior keywords (copy, overflow, menu, tooltip, date range, etc.)

3) Reuse or extend existing abstractions when the differences are only:
- Text/labels
- Icons
- Spacing or layout tweaks
- Minor visual variants

If those are the only differences, creating a new component is not allowed.

## Reuse vs create (strict)

- Default behavior is reuse. Creating new components is the exception.
- If a UI structure appears in two or more places (in the current change or existing code), it must be a shared component.
- If the same logic appears in two or more places, it must be extracted into a hook or utility.
- If you add a second instance of a duplicated pattern, you must refactor immediately, not later.
- New components must represent a reusable, named abstraction with a clear purpose and explicit props. A block of JSX with click handlers is not a component.

## Component creation rules (strict)

- When asked to create a component, you must first classify the request as either:
  - **Generic UI pattern** (switch, segmented control, toggle group, button group, card, list item, etc), or
  - **Context-specific component** tied to a single feature/page.
- If it can reasonably be generic, **implement the generic component first** in `src/components` and configure it via props.
- Context-specific components are only allowed when:
  - The component is tightly coupled to a specific domain/feature, **and**
  - The structure/behavior does not make sense outside that context.
- **Never** embed domain-specific logic, labels, or icons inside a generic component. Inject everything via props.
- **Do not** recreate a reusable UI pattern using raw JSX if a generic component exists or can be extended.

### Single-use components (narrow exception)

A new component used only once is allowed only when it is required to keep a parent file within the size limits or to keep responsibilities separate. In that case:

- It must be placed under the relevant feature’s `components/` folder.
- It must be strictly presentational.
- It must not contain new logic, formatting, or transformations.

If those conditions are not met, keep the JSX inline in the parent component and refactor only when reuse is required.

### Examples (not exhaustive)

- Action buttons (copy, dislike, overflow menu, etc.) appearing in more than one place must be a shared component.
- Repeated card headers, empty states, or list item layouts must be components.
- Date formatting or date range logic must live in utilities, not inside components.

## Separation of concerns (strict)

- Components are presentational only.
  - They may accept callbacks and props.
  - They must not fetch data.
  - They must not perform formatting, transformation, or business logic beyond trivial conditional rendering.
  - Event handlers must delegate to hook actions or props; no inline logic beyond calling those functions.
- Generic components must be domain-agnostic: no theme handling, feature flags, API calls, or business rules.
- Domain logic must live in hooks, services, or utilities and be injected into components via props.
- Hooks own state, side effects, and orchestration.
- Services own API calls.
- Utilities own pure, reusable logic (formatters, parsers, calculations).
- Cross-cutting or reusable logic must live in `src/utils` or feature `utils`, never inside a component file.

If there is any reasonable chance logic could be reused in the future, it belongs in a utility, not inside a component.

## Structure and placement rules

- Screens compose features and components.
- Features group domain logic, hooks, services, and related UI.
- Reusable UI components live in `src/components`.
- Feature-specific UI components live in `src/features/<feature>/components`.
- Feature hooks live in `src/features/<feature>/hooks`.
- Feature utilities live in `src/features/<feature>/utils`.
- App-level utilities live in `src/utils`.

## Files and naming

- Use kebab-case for all files.
- One component per file.
- Prefer named exports.
- Hooks must start with `use`.
- **Do not** name generic components after the first use case.
  - Bad: `ThemeSelector`
  - Good: `SegmentedControl`, `ToggleGroup`, `Switch`

## State

- Prefer local state (`useState`).
- Use `useReducer` when state becomes complex or action-driven.
- Keep state close to where it is used.
- Lift state only when necessary.
- Avoid global state unless clearly required.

## Data fetching

- API calls live in `services/` or feature-level service files.
- Screens and components never fetch data directly.
- Consume data via hooks (`use-` pattern).

## Styling

- Use Tailwind CSS.
- Avoid inline styles unless unavoidable.
- Prefer composition over custom CSS.
- Keep styles close to components.

## Responsive design

- Application must work on both desktop and mobile browsers.
- UI must be fluid and responsive, not limited to fixed breakpoints.
- Use Tailwind's responsive utilities (sm:, md:, lg:, etc.) when needed.
- Test layouts at various viewport sizes, not just specific device sizes.
- Mobile-first approach: start with mobile layout, enhance for larger screens.

## TypeScript

- No `any`.
- Use explicit types at function boundaries.
- Define types for API responses.
- Domain-specific types live with their feature.
- Global types live in `src/types`.

## File size and readability limits (enforced)

- Component files must not exceed 200 lines.
- Hook files must not exceed 200 lines.
- Utility files must not exceed 150 lines.
- If you exceed these limits, you must split the file into smaller, single-purpose pieces before finishing the task.

## Do not

- Mix UI and business logic.
- Duplicate utilities or markup.
- Introduce one-off UI structures when a reusable component exists or can be composed.
- Bypass existing abstractions.
- Refactor unrelated code.

## When unsure

- Match existing code patterns.
- Choose the simplest solution.
- Ask before introducing new structure.

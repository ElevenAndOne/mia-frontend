# AGENTS.md

## Stack

- React 19.2
- TypeScript
- Vite
- Tailwind CSS v4

## Core principles

- Keep things simple and readable
- Prefer clear structure over clever abstractions
- Follow existing patterns before introducing new ones
- Do not add new libraries without strong justification

## Files and naming

- Use kebab-case for all files
- One component per file
- Prefer named exports
- Hooks must start with `use`

## Structure

- Screens compose features and components
- Features group domain logic, hooks, services, and related UI
- Components are primarily presentational

## Data flow

- Feature-specific or global data should come from context providers
- Use props mainly for presentational components
- Avoid deep prop drilling

## State

- Prefer local state (`useState`)
- Use `useReducer` when state becomes complex or action-driven
- Keep state close to where it is used
- Lift state only when necessary
- Avoid global state unless clearly required

## Data fetching

- API calls live in `services/` or feature-level service files
- Screens and components never fetch data directly
- Consume data via hooks (`use-x` pattern)

## Styling

- Use Tailwind CSS
- Avoid inline styles unless unavoidable
- Prefer composition over custom CSS
- Keep styles close to components

## TypeScript

- No `any`
- Use explicit types at function boundaries
- Define types for API responses
- Domain-specific types live with their feature
- Global types live in `/types`

## Shared logic

- App-aware shared logic (hooks, config, context helpers) lives close to where it’s used
- Pure, reusable utilities should stay framework-agnostic

## Git workflow

- Ensure type checks pass
- Run lint and format checks
- Verify the project builds successfully
- Only then open a PR

## Do not

- Mix UI and business logic
- Duplicate utilities
- Refactor unrelated code
- Bypass existing abstractions

## When unsure

- Match existing code patterns
- Choose the simplest solution
- Ask before introducing new structure
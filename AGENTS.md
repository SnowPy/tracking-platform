# Repository Guidelines

## Project Structure & Module Organization

Source code lives under `src/`. Each domain has a clear home:

- `src/api/` — Data-access layer. One module per domain (`events.ts`, `categories.ts`, `requirements.ts`, etc.). Each module exports async functions that query Supabase and return typed results. API modules never import React or component code.
- `src/components/` — Reusable UI components (`AuthGuard.tsx`, `MainLayout.tsx`, `PropertyTable.tsx`). Shared across pages.
- `src/pages/` — Route-level page components, organized by domain into subdirectories (`events/`, `properties/`, `requirements/`, `categories/`, `docs/`). Each subdirectory holds the main page plus associated modals or sub-components.
- `src/stores/` — Zustand stores (`authStore.ts`, `appStore.ts`). Global state lives here; component-local state stays in the component.
- `src/types/` — TypeScript type definitions and the `Database` schema type for Supabase row types.
- `src/supabase/` — Supabase client initialization (`client.ts`). Only this module creates the client; everything else imports from it.
- `supabase/migrations/` — Database migrations, numbered sequentially (`001_init.sql`, `002_enhancements.sql`, ...).
- `public/` — Static assets served as-is.
- `dist/` — Build output (gitignored).
- Config files (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`) live at the project root.

## Build, Test, and Development Commands

- `npm run dev` — Start the Vite dev server with HMR.
- `npm run build` — Run `tsc -b` for type checking, then `vite build` for production output.
- `npm run lint` — Run ESLint across all `.ts` / `.tsx` files.
- `npm run preview` — Serve the production build locally.

There are no test runners configured yet. When adding tests, place them in a `__tests__/` directory co-located with the module being tested, and use a framework consistent with the project's dependencies.

## Coding Style & Naming Conventions

- **Language**: TypeScript with strict mode enabled. All source files are `.ts` or `.tsx`.
- **Formatting & linting**: ESLint (v10) with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`. Run `npm run lint` before committing.
- **Naming**:
  - Components and their files: PascalCase (`EventListPage.tsx`, `AuthGuard.tsx`).
  - Utility modules and API files: camelCase (`events.ts`, `authStore.ts`).
  - Variables, functions, and hooks: camelCase.
  - TypeScript interfaces and types: PascalCase (`TrackingEvent`, `DashboardStats`).
  - Database enum values: snake_case (`draft`, `in_progress`, `active`).
- **Imports**: Use path-relative imports. No alias or barrel re-exports unless introduced explicitly.
- **UI**: Ant Design components with `ConfigProvider` theming. Always import `antd` locale explicitly (e.g., `zhCN`). Avoid ad-hoc CSS; prefer Ant Design tokens and component props.

## Testing Guidelines

The project does not yet have a test framework installed. Until one is added:

- Keep side-effect-free logic (type guards, formatting helpers, validation) in pure functions that are easy to test later.
- Avoid tight coupling between API modules and component logic — this keeps the API layer testable in isolation without React.

## Commit & Pull Request Guidelines

This project does not enforce a strict commit convention yet. Follow these general practices:

- Write commit messages in English, using the imperative mood ("Add event filtering by status", not "Added event filtering").
- Keep commits focused on a single logical change.
- For pull requests: include a description of what the change does and why, link any related issue, and attach a screenshot if the change touches the UI.
- Squash trivial fixup commits before merging.

## Security & Configuration Tips

- **Never commit `.env`** — the file is already in `.gitignore`. Copy `.env.example` to `.env` and fill in your Supabase credentials.
- The Supabase client uses the **anon key** for Row-Level Security (RLS). All access control should be enforced through Supabase RLS policies, not in the client.
- Environment variables are accessed via `import.meta.env.VITE_*`. Only variables prefixed with `VITE_` are available to the client bundle.

## Architecture Overview

The app follows a **presentation-data access** separation:

1. **Pages** (`src/pages/`) define routes and compose UI from Ant Design components and shared components.
2. **Stores** (`src/stores/`) hold global state (authentication, session) using Zustand.
3. **API modules** (`src/api/`) abstract Supabase queries and mutations. Pages and stores call these functions; they never call `supabase` directly.
4. **Types** (`src/types/index.ts`) define the shared schema, including the `Database` type that maps Supabase tables to Row/Insert/Update shapes.
5. **Auth** flows through `AuthGuard.tsx`, which checks the Zustand auth store before rendering protected routes.

When adding a new feature:

- Define types in `src/types/index.ts` first.
- Add API functions in `src/api/`.
- Create the page component in `src/pages/<domain>/`.
- Wire the route in `src/App.tsx`.
- If the feature needs global state, add a store in `src/stores/`.
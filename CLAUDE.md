# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

埋点管理平台 (Event Tracking Management Platform) — a React SPA for managing analytics events, their properties, categories, and tracking requirements. Built with React 19, TypeScript 6, Vite 8, Ant Design 6, and Supabase.

## Commands

```bash
npm run dev          # Start Vite dev server (HMR)
npm run build        # Type-check (tsc -b) then build (vite build)
npm run lint         # ESLint across all .ts/.tsx files
npm run preview      # Serve production build locally
npm run test         # Run vitest (tests in src/__tests__/**/*.test.ts)
npx vitest run       # Run tests once (same as npm run test)
```

## Architecture

**Layered separation — pages never call Supabase directly:**

```
Pages (route-level UI, compose components)
  → API modules (data-access, query Supabase, return typed results)
    → supabase/client.ts (single Supabase client instance)
```

- **`src/api/`** — One module per domain (`events.ts`, `categories.ts`, `requirements.ts`, etc.). Exports async functions that call Supabase and return typed data. Never imports React.
- **`src/components/`** — Shared UI: `AuthGuard.tsx` (auth gate using `<Outlet>`), `MainLayout.tsx` (sidebar + header + content via `<Outlet>`), `ErrorBoundary.tsx` (class component catching render errors), `StatusBadge.tsx`, `PropertyTable.tsx`, `PropertyTypeTag.tsx`.
- **`src/pages/`** — Route-level pages organized by domain: `events/`, `properties/`, `requirements/`, `categories/`, `docs/`. Some domains include modal components (e.g., `EventFormModal.tsx`).
- **`src/stores/`** — Zustand stores. `authStore.ts` manages session, user, profile, and exposes `signInWithPassword`, `signUp`, `signOut`, `initialize`. Called once from `App.tsx` on mount.
- **`src/types/index.ts`** — All TypeScript interfaces (`TrackingEvent`, `Requirement`, `UserProperty`, `CommonProperty`, `EventProperty`, `ProposedProperty`, `DashboardStats`, etc.) plus the `Database` interface for Supabase row types.
- **`src/supabase/client.ts`** — Single `createClient()` call using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. All other modules import from here.

**Routing** (react-router-dom v7, defined in `App.tsx`):
- `/login` — public, `LoginPage`
- Everything else is wrapped in `<AuthGuard>` (redirects to `/login` if no session) and `<MainLayout>` (sidebar + header shell):
  - `/` — DashboardPage
  - `/events`, `/events/:id` — event list and detail
  - `/user-properties`, `/common-properties` — property management
  - `/categories` — category management
  - `/requirements`, `/requirements/:id` — requirement kanban and detail
  - `/property-types` — dynamic property type configuration
  - `/docs` — documentation page

**Key dependencies:**
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop for the requirements kanban board
- `@ant-design/charts` — dashboard charts
- `zustand` — global state management
- `antd` 6.x with `ConfigProvider` locale set to `zhCN`

## Database & Auth

- Supabase backend. Schema managed via migrations in `supabase/migrations/` (numbered sequentially: `001_init.sql`, `002_enhancements.sql`, etc.).
- Auth uses Supabase Auth. The `AuthGuard` component checks `authStore.session`; `authStore.initialize()` restores the session from Supabase on page load and subscribes to `onAuthStateChange`.
- **RLS is the security boundary** — the client uses the anon key. Do not implement access control logic in the frontend.
- Environment: copy `.env.example` to `.env`, fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Only `VITE_`-prefixed variables are available to client code.

## Naming Conventions

- **Files & components**: PascalCase (`EventListPage.tsx`, `AuthGuard.tsx`)
- **API modules, stores, utilities**: camelCase (`events.ts`, `authStore.ts`)
- **Types/interfaces**: PascalCase (`TrackingEvent`, `DashboardStats`)
- **Database enum values**: snake_case (`draft`, `in_progress`, `active`)
- **Commits**: English, imperative mood ("Add event filtering by status")

## TypeScript Config

Strict mode with `noUnusedLocals` and `noUnusedParameters` enabled. `verbatimModuleSyntax` is on — use `import type` for type-only imports. Module resolution is bundler mode (Vite).

## CI

GitHub Actions on push/PR to `master`: lint → build → test (`npx vitest run`).

## Adding a New Feature

1. Define types in `src/types/index.ts`
2. Add API functions in `src/api/<domain>.ts`
3. Create the page component in `src/pages/<domain>/`
4. Wire the route in `src/App.tsx`
5. If it needs global state, add a Zustand store in `src/stores/`

每次需要先在本地测试，等我确定没有问题后，再同步到生产环境
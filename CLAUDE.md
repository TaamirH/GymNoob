# GymNoob — notes for Claude

Read `docs/SPEC.md` first. It is the source of truth for scope, screens, data model and progression rules.

## Layout

- `src/db/` — Dexie schema (`db.ts`), types (`types.ts`), idempotent seed (`ensureSeed`).
- `src/data/exercises.ts` — built-in exercises with Hebrew guides. Content fields are refreshed on every app start; user-tunable fields (increment, rest, rep range) are not.
- `src/logic/` — pure functions (progression engine, stats). No DB access. Unit-tested with Vitest.
- `src/features/<area>/` — pages and feature components.
- `src/components/` — UI primitives (Button, Card, Icon, BottomNav, PageHeader).
- `src/i18n/` — `en.ts` is the typed source; `he.ts` must mirror every key.
- `src/sw.ts` — custom service worker (injectManifest). Handles precache, media caching, notification click.

## Conventions

- Tailwind v4 with design tokens defined as CSS variables in `src/index.css` and exposed via `@theme inline`. Use `bg-surface`, `text-muted`, `text-accent`, etc. Never hardcode colors in components.
- Hebrew guide content is always rendered with `dir="rtl" lang="he"` regardless of UI language.
- Every DB write during a workout happens immediately. Never buffer sets in React state only.
- IDs are `nanoid()`. Timestamps are `Date.now()` numbers. Dates for bodyweight are `YYYY-MM-DD` local.
- `npm run build` runs `tsc --noEmit` first; keep it clean.

## Commands

`npm run dev`, `npm test`, `npm run build`, `npm run icons`.

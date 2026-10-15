# GymNoob

Personal workout tracker for a beginner on a machine-based full-body circuit.
Installable web app (PWA) for Android, works offline, data stays on the device.

- Double progression (10–15 reps × 2 sets): the app proposes the next weight.
- Hebrew form guides with common mistakes for every exercise.
- One-tap set logging, auto-starting rest timer, weekly session tracker.
- Charts: weight over time, weekly sets per muscle, PRs.
- JSON export/import for backup.

See [docs/SPEC.md](docs/SPEC.md) for the full plan.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (also reachable on the LAN)
npm test           # progression engine tests
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
npm run icons      # regenerate PNG icons from public/icon.svg
```

## Deploy

Static hosting. Cloudflare Pages settings:

- Build command: `npm run build`
- Output directory: `dist`

`public/_redirects` handles SPA routing.

## Stack

Vite · React · TypeScript · Tailwind CSS v4 · Dexie (IndexedDB) · vite-plugin-pwa · Recharts · Vitest

# GymNoob

Personal workout tracker for a beginner on a machine-based full-body circuit.
Installable web app (PWA) for Android, works offline, all data stays on the device.

- **Double progression** (10–15 reps × 2 sets): the app proposes the next weight, bumps it when every set hits 15, deloads after three failed sessions. Assisted machines progress downward.
- **Hebrew form guides** for every exercise: setup, execution, common mistakes, cues. Editable in-app. Demo GIFs from an open dataset.
- **One-tap logging**: rows come pre-filled, a full session is 14 taps. Effort chips, steppers and a numeric pad when you need them.
- **Rest timer** that survives reloads and backgrounding, with sound, vibration and a notification.
- **Weekly tracker**, history with set editing, charts (weight over time, weekly sets per muscle, PRs, bodyweight).
- **English or Hebrew UI**, dark or light theme, JSON export/import.

See [docs/SPEC.md](docs/SPEC.md) for the full plan and data model.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (also reachable on the LAN)
npm test           # progression engine and stats tests
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
npm run icons      # regenerate PNG icons from public/icon.svg
```

## Deploy (Cloudflare)

Cloudflare's dashboard connects the GitHub repo and deploys it as a Worker that serves static assets (free tier).

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Output directory: `dist`

`wrangler.jsonc` in the repo tells Wrangler to upload `dist/` and to serve `index.html` for unknown paths (single-page routing). Every push to `main` redeploys.

Any static host that serves `dist/` over HTTPS with a single-page fallback works the same way.

## Install on the phone

1. Open the deployed URL in Chrome on Android.
2. Menu → **Add to Home screen** (or tap **Install app** in Settings when Chrome offers it).
3. Launch from the home screen for full-screen mode. The app works offline after the first load.
4. In Settings, enable **Notifications** so the rest timer can alert you when the app is in the background.

A rest alert while the phone is locked is best-effort in a web app. If it turns out to matter, the next step is wrapping the same code with Capacitor for native notifications.

## Backup

Settings → **Export JSON** downloads everything. **Import** merges or replaces. Keep the file in Google Drive now and then.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Dexie (IndexedDB) · vite-plugin-pwa · Vitest

## Credits

Exercise demo GIFs come from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (MIT). The media is © Gym visual — https://gymvisual.com/ and is shown with that attribution.

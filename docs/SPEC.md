# GymNoob — Version 1 Spec

Personal workout tracker for a beginner on a machine-based full-body circuit.
Written 2026-10-15. This is the plan we build from; edit it as decisions change.

## Status (2026-10-15)

Build steps 1–7 below are implemented and verified with a headless-browser click-through
(two full workouts, a bump, rest timer end, routine editing, custom exercise, export, reset,
Hebrew and light themes). Beyond the plan, the whole UI is already available in Hebrew via
Settings, and the seven built-in exercises carry demo GIFs.

Not done: deployment to Cloudflare Pages (needs the owner's GitHub and Cloudflare accounts),
step 8 (Capacitor wrapper), a full exercise-dataset import, and an estimated-1RM chart (the
per-exercise estimate is shown as a stat).

## 1. Decisions

| Area | Decision |
|---|---|
| Platform | Installable web app (PWA) for Android, used in the browser on PC too. Structured so a Capacitor APK wrapper can be added later without a rewrite. |
| Stack | Vite + React + TypeScript, Tailwind CSS, Dexie (IndexedDB), vite-plugin-pwa, Vitest for logic tests. |
| Data | Local on the device only. JSON export/import for backup. No account, no server, no sync. |
| Hosting | Cloudflare Pages from a private GitHub repo (free, HTTPS, works with private repos). Workout data never leaves the phone. |
| Units | kg. Default increment 5 kg, per-exercise override (2.5 kg where the gym has add-on plates). |
| Language | UI strings in English through a small dictionary so a full Hebrew UI is a toggle later. Exercise guides are written in Hebrew and rendered right-to-left. |
| Font | Heebo (Google Fonts): clean, modern, covers Hebrew and Latin in one family. |
| Theme | Dark by default. One vivid accent color (proposal: lime `#C8F23D` on near-black navy `#0B0F14`). Large numerals, big tap targets, one-handed layout with actions at the bottom. |
| Progression | Prescriptive double progression, 10–15 reps, 2 sets. The app proposes weight and reps; the user can override anything. |
| Effort | Four chips after each set: Easy / OK / Hard / Failed. Optional; untouched means OK. |
| Rest timer | 90 s default, auto-starts when a set is confirmed, adjustable per exercise. |
| Bodyweight | Optional entry, prompted once a week. Needed for assisted machines. |
| Schedule | 3 sessions per week, same full-body routine each time. Home screen tracks sessions done this week out of 3. |
| Routine | Seeded with the 7-machine circuit. Simple editor: add, remove, reorder exercises from the built-in library. Big exercise dataset import is a later milestone. |
| Charts v1 | Per-exercise weight and reps over time, weekly sets per muscle group against the 10-set target, PR list. Estimated 1RM later. |
| Skipped | Plate calculator, warm-up calculator, cloud sync, social features, iOS-specific features. |

## 2. Seeded routine: "Full Body"

| # | Exercise | Primary muscles | Assisted | Increment |
|---|---|---|---|---|
| 1 | Leg Press | Quads, glutes, hamstrings | no | 5 kg |
| 2 | Leg Curl | Hamstrings | no | 5 kg |
| 3 | Chest Press | Chest, front delts, triceps | no | 5 kg |
| 4 | Seated Row | Lats, rhomboids, biceps | no | 5 kg |
| 5 | Shoulder Press | Delts, triceps | no | 5 kg |
| 6 | Chin Assist | Lats, biceps | yes | 5 kg |
| 7 | Dip Assist | Triceps, lower chest | yes | 5 kg |

All items: 2 working sets, 10–15 reps, 90 s rest.

Assisted machines are inverted: more weight on the stack means easier. The app shows the
stack weight (what you actually pin) and progresses it downward. Effective load is
bodyweight minus assist, shown on the progress chart when bodyweight is known.

## 3. Screens and the quick-tap flow

Bottom navigation with five tabs: Today, History, Progress, Exercises, Settings.

### Today
- Week strip showing the 3 target sessions and which are done.
- One big button: **Start Full Body**. Below it, a preview of today's prescriptions
  (exercise, weight, "2 × 10–15").
- If a workout was left unfinished, the button becomes **Resume**.

### Active workout
- Exercises as a vertical list of cards. The current exercise is expanded, the rest collapsed
  with a one-line summary.
- Each set row is pre-filled with the prescribed weight and the reps from last time.
  One tap on the check mark logs it as shown. That is the entire happy path:
  7 exercises × 2 sets = 14 taps.
- Big `−` / `+` steppers on reps (step 1) and weight (step = exercise increment).
  Tapping the number opens a numeric pad for larger changes.
- After a check, the four effort chips appear under the row. Ignoring them is fine.
- Confirming a set starts the rest timer as a bottom bar: countdown, `+30 s`, `Skip`.
  The next set row is already pre-filled while you rest.
- An `i` icon on every exercise card opens its Hebrew guide in a sheet without leaving the workout.
- A short vibration on set confirm and on rest end (where the browser allows it).
- Every set is written to the database the moment it is confirmed. Closing the browser mid-workout loses nothing.
- **Finish** on the last set. Summary screen: total sets, total volume (kg × reps),
  new PRs, and a "next time" list showing which weights went up and why.

### Exercises
- Grid of cards with name, muscle tags, and a thumbnail.
- Detail page in Hebrew, right-to-left: muscles, setup (seat and handle adjustments),
  execution steps, common mistakes, cues. Optional GIF.
- Per-exercise settings: increment, rest, rep range, assisted flag.

### History
- Reverse-chronological list of workouts. Tap one to see every set.
- Edit or delete sets after the fact.

### Progress
- Pick an exercise: weight and reps over time, with PR markers.
- Weekly sets per muscle group as bars against the 10-set target line.
- PR list across all exercises.
- Bodyweight line when entries exist.

### Settings
- Default rest, increment, theme, language, notifications permission.
- Bodyweight entry.
- Export JSON, import JSON (replace or merge).
- Reset data (double-confirm).

## 4. Rest timer behaviour in a PWA

The browser may freeze the page when the screen is off. The timer must not depend on
a running `setInterval`:

1. On start, store `restEndsAt` (absolute timestamp) in the database.
2. The visible countdown computes `restEndsAt − now` on every tick and resyncs on
   `visibilitychange`, `pageshow`, and `focus`.
3. Request a Screen Wake Lock while the workout screen is visible, so the screen stays on
   if the phone is in hand.
4. If notification permission is granted and the page is hidden when the rest ends, the
   service worker shows a "Rest over" notification with vibration.
5. If the phone was locked and the browser frozen, the notification may be late or missing.
   This is the known PWA limit. If it turns out to matter in practice, milestone 8 wraps
   the app with Capacitor and uses native local notifications instead.

## 5. Data model (Dexie / IndexedDB)

```
exercises
  id, nameEn, nameHe, primaryMuscles[], secondaryMuscles[], equipment,
  isAssisted, incrementKg, defaultMinReps, defaultMaxReps, defaultRestSec,
  guideHe { setup[], steps[], mistakes[], cues[] }, mediaUrl?, attribution?

routines
  id, name, items[] { exerciseId, order, sets, minReps, maxReps, restSec }

prescriptions            -- what the app will propose next time, one row per exercise
  exerciseId, weightKg | null, sets, minReps, maxReps, updatedAt, source ('auto' | 'manual'), reason

workouts
  id, routineId, startedAt, finishedAt | null, status ('active' | 'completed' | 'discarded'), notes

workoutItems
  id, workoutId, exerciseId, order, prescribedWeightKg, prescribedReps

sets
  id, workoutId, workoutItemId, exerciseId, setNumber,
  weightKg, reps, effort ('easy' | 'ok' | 'hard' | 'failed'), type ('working' | 'warmup'),
  completedAt

bodyweight
  id, date, kg

settings  (single row)
  units, language, theme, defaultRestSec, defaultIncrementKg, notificationsEnabled, restEndsAt | null
```

`workoutId` and `exerciseId` are duplicated onto `sets` on purpose so history and chart
queries do not need joins. Warm-up sets are excluded from volume, PRs, and progression.

Export is one JSON file containing every table plus a schema version number.

## 6. Progression engine

A pure function, unit-tested, with no database access:

```
nextPrescription(exercise, currentPrescription, recentSessions) -> { prescription, reason }
```

Rules, evaluated when a workout is finished, per exercise:

1. **No history yet:** weight is `null`. The first set row asks for a starting weight and
   shows a one-line hint: pick a weight where rep 15 is hard but doable. Nothing is
   auto-adjusted until a session is completed at that weight.
2. **Bump:** every working set in this session reached `maxReps` →
   weight += increment (assisted: weight −= increment, floor 0). Reason: "15 × 2 at 40 kg".
3. **Deload:** three consecutive sessions at the same weight where any set fell below
   `minReps` or was marked Failed → weight −= increment (assisted: += increment).
   Reason: "below 10 reps three sessions in a row".
4. **Hold:** anything else. Reason: "keep building reps".
5. **Manual override** sets `source = 'manual'` and the engine respects it as the new base.

The prescribed reps shown on each set row are the reps achieved on that set number last
session, so the goal of "beat last time by one rep" is visible without math.

## 7. Hebrew exercise guides

Written per exercise in a fixed structure: muscles, setup, execution, common mistakes, cues.
Tone: short imperative lines, no fluff. Sample for Chest Press, to confirm the style
before the other six are written:

> **לחיצת חזה במכונה**
>
> **שרירים:** חזה, כתף קדמית, יד אחורית (טרייספס).
>
> **הגדרה**
> - כוונו את גובה המושב כך שהידיות בגובה אמצע החזה.
> - הצמידו גב וישבן למשענת, כפות הרגליים יציבות על הרצפה.
> - משכו את השכמות אחורה ולמטה ו"נעלו" אותן למשענת. הן נשארות שם לאורך כל הסט.
>
> **ביצוע**
> - דחפו קדימה עד כמעט יישור מלא של המרפקים, בלי לנעול אותם.
> - חזרו לאט, 2–3 שניות, עד שהידיות בגובה החזה ומורגשת מתיחה קלה.
> - נשימה פנימה בירידה, נשיפה בדחיפה.
>
> **טעויות נפוצות**
> - הכתפיים מתגלגלות קדימה בדחיפה. השכמות צריכות להישאר צמודות למשענת.
> - קשת מוגזמת בגב התחתון. הישבן והגב נשארים צמודים.
> - נעילת מרפקים בסוף התנועה. העומס עובר למפרק במקום לשריר.
> - טווח תנועה חלקי. להוריד עד גובה החזה בכל חזרה.
> - משקל גבוה מדי שגורם לתנופה. אם אי אפשר לשלוט בירידה, להוריד משקל.
>
> **טיפ:** אם אתם לא מרגישים את החזה עובד, הורידו 5 ק"ג וחזרו על ההגדרה.

The guides are written from standard coaching cues and the research notes. Have a trainer
at the gym sanity-check the setup lines for your specific machines.

Optional media: GIF per exercise from the `hasaneyldrm/exercises-dataset` repo
(MIT code, GIFs © Gym Visual, attribution string must stay visible on the detail page).

## 8. Build order

Each milestone leaves a usable app.

1. **Scaffold.** Vite + React + TS, Tailwind, Heebo, design tokens, bottom nav shell,
   Dexie schema with seed data (7 exercises, Full Body routine), PWA manifest and
   service worker, git init.
2. **Active workout.** Start, pre-filled set rows, one-tap confirm, steppers, numeric pad,
   effort chips, rest timer bar, finish summary. Persist every set immediately. Resume.
3. **Progression engine.** Pure function with Vitest tests, prescriptions table,
   "next time" summary, manual override, assisted inversion.
4. **Exercise guides.** All seven in Hebrew, RTL detail page, in-workout info sheet,
   per-exercise settings.
5. **History and Progress.** Workout list, set editing, the three v1 charts, PR list,
   weekly 3-session tracker on Today.
6. **Settings and data.** Bodyweight, export/import JSON, routine editor, reset.
7. **Polish and ship.** Animations, haptics, empty states, icons and splash,
   deploy to Cloudflare Pages, install on the phone, test the rest timer with the screen off.
8. **Only if needed.** Capacitor wrapper and native local notifications for the rest timer.
   Later: import a full exercise dataset, Hebrew UI strings, estimated 1RM chart.

## 9. Out of scope for v1

Accounts, sync between devices, social features, barbell tooling, AI program generation,
wearables, iOS-specific features.

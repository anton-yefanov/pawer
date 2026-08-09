# Workout Tracker App — Implementation Plan

**Platform:** iOS (Expo / React Native)
**Model:** Freemium, subscription via RevenueCat
**Differentiator:** Illustrated cat mascot
**Target:** Ship MVP in 8–10 weeks, solo

---

## 0. Strategic Premise

Strong, Hevy, and a dozen others already do workout logging well. We will not win on
features. Competitor pricing sets our ceiling: Hevy Pro is $2.99/mo, $23.99/yr, $74.99
lifetime; Strong PRO is $4.99/mo, $29.99/yr, $99.99 lifetime.

**The only durable differentiator is the mascot.** Every scoping decision below defers
to that. Ship narrow, ship polished, ship the cat.

Two rules that govern everything:

1. **Never paywall logging or access to a user's own data.** A logger that locks you out
   mid-set at the gym earns 1-star reviews, not conversions.
2. **The app must work with zero connectivity.** Gym basements have no signal.

---

## 1. MVP Scope

### In scope

- Exercise library — ~200 exercises, bundled locally, searchable, filter by muscle group + equipment
- Active workout: start empty → add exercise → log sets (weight, reps) → finish
- Templates: create, save, start from
- Rest timer with background notification
- Workout history list + per-exercise "last time" shown inline while logging
- PR detection (heaviest set, best estimated 1RM)
- Mascot reactions at emotional beats
- Paywall + subscription

### Explicitly out of v1

Resist all of these:

- Apple Watch app
- Social feed / sharing
- Custom exercise creation *(paid feature, but post-launch)*
- Supersets, drop sets, RPE
- Apple Health sync
- Cardio tracking
- Body measurements, progress photos
- Plate calculator, warmup calculator
- Cloud sync and user accounts

### On cloud sync

**Skip it.** Local SQLite only, with iCloud-backed file backup. Auth costs two weeks and
buys nothing until Android exists.

**But design the schema assuming sync arrives later:**

- UUID primary keys, never integer autoincrement
- `updated_at` on every row
- Soft deletes via `deleted_at`

Retrofitting sync onto autoincrement IDs is genuinely painful. This costs nothing now.

Warn users clearly in onboarding that data is local-only.

---

## 2. Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK (latest), **dev build** — not Expo Go | RevenueCat has native code |
| Routing | Expo Router | File-based, tabs out of the box |
| Database | `expo-sqlite` + **Drizzle ORM** | Typed queries, real migrations, local-first |
| State | Zustand | Active-workout state is the only complex bit |
| Payments | RevenueCat + StoreKit 2 | Plus their remote paywall builder |
| Analytics | PostHog (free tier) | Funnels + session replay |
| Crash reporting | Sentry (free tier) | |
| Notifications | `expo-notifications` | Rest timer + streak nudges |
| Charts | Victory Native XL or react-native-skia | Post-MVP, for paid analytics |
| Images | `expo-image` | Native WebP support on iOS |

### Exercise data

Use **`yuhonas/free-exercise-db`** (GitHub, public domain, ~800 exercises with
muscle/equipment metadata). Curate down to ~200, bundle as JSON, seed SQLite on first
launch. **Do not fetch at runtime.**

---

## 3. Known Technical Traps

### 3.1 The rest timer

iOS suspends your JS a few seconds after backgrounding. **You cannot run a JS interval.**

The pattern that works:

1. Store the timer's **end timestamp**, not a countdown value
2. Schedule a local notification for that timestamp immediately
3. Recompute remaining time from wall-clock on every foreground event
4. Cancel the notification if the user finishes the set early

Everyone gets this wrong on the first attempt. Build it this way from the start.

### 3.2 The set-logging screen

This is ~80% of perceived app quality and ~80% of your bug surface. Budget two full weeks.

Requirements:

- Keyboard doesn't cover the active input
- Decimal input works for kg/lb (locale-aware separators)
- Autofocus advances correctly between weight → reps → next set
- **State survives backgrounding mid-set** (user answers a text, comes back)
- Previous session's values shown as placeholder/ghost text
- Large tap targets — this is used with chalky, sweaty hands

### 3.3 Unit handling

Store everything in **one canonical unit (kg)** in the database. Convert at the display
layer only. Mixing storage units is a data-corruption bug you will not notice for months.

---

## 4. Monetization

### Free tier

- Unlimited workouts logged, forever
- Full exercise library
- 3 custom templates
- Rest timer, PR notifications
- Last 3 months of history
- Base mascot

### Paid tier

- Unlimited custom templates
- Full history + progress charts, volume by muscle group, 1RM trends
- Custom exercises
- Apple Health sync, CSV export, iCloud backup

### Pricing

| Plan | Price                     |
|---|---------------------------|
| Monthly | $2.99                     |
| Annual | $29.99 (7-day free trial) |
| Lifetime | $69.99                    |

Push annual hard — roughly 2–3× the LTV of monthly in fitness, where January churn is
brutal. Include lifetime; both incumbents do, and it converts the anti-subscription
segment that would otherwise pay nothing.

### Paywall placement

**After the user's first completed workout**, not on launch. They need to feel the product
work once. RevenueCat's remote config lets you A/B this without shipping a build.

---

### 5 Export specs

Measured against reference screenshots (1179px @ 3x):

| Use | Display size | Export size | Count |
|---|---|---|---|
| List thumbnail | 48pt | **150px** | 1 per exercise |
| Detail view | ~200pt | **600px** | 2 per exercise |

**Format: WebP, lossy q85, with alpha.** ~50% smaller than optimized PNG, native support
in `expo-image`. Never JPEG — no alpha channel, and DCT compression destroys crisp outlines.

Estimated bundle: 200 thumbnails (~1.6 MB) + 400 detail images (~16 MB) = **~18 MB**.

**Critical:** trim both frames of a pair to the **same** bounding box. Cropping each frame
to its own tight box silently breaks the illusion — if the cat shifts 8px between frames,
toggling reads as a glitch, not a rep. Lock hip/center-of-mass to a fixed guide.

In-app: **cross-fade at ~150ms** rather than hard-cutting. Two decent stills with a fade
read as movement; a hard snap reads as a broken image loader.

Thumbnail frame choice: use whichever frame has the most distinctive silhouette — usually
the stretched/bottom position. At 48pt, pose legibility is all you have.

### 5.1 Build the pipeline before image #3

Keep one **master per frame** (1200px PNG, alpha, consistent bounding box) and generate
both output sizes by script:

```bash
# Detail images — both frames
for f in masters/*.png; do
  n=$(basename "$f" .png)
  cwebp -q 85 -alpha_q 100 -resize 600 0 "$f" -o "assets/detail/$n.webp"
done

# Thumbnails — frame 1 only
for f in masters/*_1.png; do
  n=$(basename "$f" _1.png)
  cwebp -q 85 -alpha_q 100 -resize 150 0 "$f" -o "assets/thumb/$n.webp"
done
```

Then resizing the detail view from 200pt to 240pt is a re-run, not a re-commission.
Doing 400 images by hand through a GUI is how the project dies.

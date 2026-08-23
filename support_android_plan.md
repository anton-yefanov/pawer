# Android Support Plan

Assessment of what it takes to bring Pawer — built iOS-first — to a polished
Android release. Written against the tree at `92761a5`.

## Prime directive

**Nothing in this plan may change how iOS looks or behaves.**

The iOS build is the reference implementation and stays byte-for-byte
equivalent in appearance and feel. Every step below is additive: a new
platform branch, a new `.android.tsx` sibling, a new fallback path. Concretely:

- No `@expo/ui/swift-ui` host is deleted or rewritten to a cross-platform
  widget. SwiftUI stays the iOS path.
- No SF Symbol is swapped for a Material one on iOS. Symbol names gain an
  `android` counterpart; the `ios` value is the string that is there today.
- Liquid glass, large titles, sheet detents, the Live Activity and the native
  tab bar keep their current iOS configuration untouched.
- When a shared component gains a platform split, iOS keeps the existing file
  verbatim — the new code lives in the Android sibling.

Any step that cannot be done without moving iOS pixels gets stopped and
re-planned, not pushed through.

**Definition of done for every step:** `npm run typecheck && npm run lint`
pass, the Android build shows the intended change, and the iOS build is
visually identical to before the step.

---

## What already ports for free

The bottom half of the app is platform-neutral and needs no work:

- **Data layer** — `src/db/` (expo-sqlite + Drizzle), migrations, seed.
- **All of `src/lib`** — units, tracking types, personal records, exercise
  search, workout stats, rest timer. Pure logic.
- **Charts** — `src/components/analytics/bar-chart.tsx` is react-native-svg.
- **Drag & drop** — `template-drag.tsx` / `exercise-reorder.tsx` are
  hand-rolled on gesture-handler + Reanimated, no DOM assumptions. Ports as-is;
  needs QA for Android touch slop.
- **Haptics** — `src/lib/haptics.android.ts` maps the vocabulary onto
  `HapticFeedbackConstants`, not the `Vibrator` API.
- **Notifications** — `src/lib/notifications.ts` already creates the
  `rest-timer` and `workout-reminders` Android channels.
- **Launcher assets** — `app.json` already carries the adaptive icon set.

The port is entirely in the presentation layer.

---

## The work, in execution order

Ordered so each step makes the next one easier to evaluate.

### Step 1 — Icon abstraction (~1–2 days)

**Problem.** `SymbolView` from `expo-symbols` is imported inline in 15 files
across ~30 call sites, with ~30 distinct SF Symbol names and no wrapper.
`expo-symbols` *does* render on Android — it draws Material Symbols from a
font — but only when `name` is an object, `{ ios: 'checkmark', android: 'check' }`.
A bare SF string renders the `fallback` prop, i.e. nothing. Today every icon
in the app would vanish on Android.

Affected files: `folder/[id].tsx`, `pr-chip.tsx`, `exercise-search-bar.tsx`,
`grouped-list.tsx`, `exercise-library.tsx`, `circle-button.tsx`,
`pose-picker.tsx`, `color-picker.tsx`, `folder-card.tsx`, `set-row.tsx`,
`exercise-card.tsx`, `big-button.tsx`, `stat-rows.tsx`, `app-tabs.web.tsx`.

**Approach.** Introduce a single `<Icon>` component plus one name-mapping
table — the abstraction the codebase currently lacks and the same shape as the
existing single-resolver convention (`exercise-images.ts`, `attribute-images.ts`).
Every call site swaps `SymbolView` for `Icon`; the `ios` half of each mapping
is the exact string in the code today.

**iOS impact:** none. Same symbol, same size, same tint, one indirection deeper.

**Do this first** — it is the lowest-risk change and it is what makes an
Android build visually legible enough to judge everything else.

### Step 2 — Native tabs (~half day)

`NativeTabs` supports Android (Material bottom navigation), but
`src/components/app-tabs.tsx` supplies icons only as `sf={{ default, selected }}`.
Android needs `drawable` (a res-folder resource) or `src`, which accepts a
`Promise<ImageSourcePropType>` — that pairs directly with expo-symbols'
`unstable_getMaterialSymbolSourceAsync`, so it reuses Step 1's mapping table.

`BottomTabInset` in `src/constants/theme.ts` already has an Android value (80).

Also revisit `android.predictiveBackGestureEnabled: false` in `app.json`.

**iOS impact:** none — the `sf` values stay exactly as they are.

### Step 3 — `@expo/ui/swift-ui` replacements (~1–1.5 weeks) — the big one

13 components are literal SwiftUI hosts and will not render on Android:

| Component | Web sibling exists? |
| --- | --- |
| `settings/toggle-row.tsx` | yes |
| `workout/exercise-menu.tsx` | yes |
| `workout/set-type-menu.tsx` | yes |
| `workout/start-time-picker.tsx` | yes |
| `workout/rest-timer-button.tsx` | yes |
| `analytics/day-picker.tsx` | yes |
| `exercise-filter-menu.tsx` | **no** — Menu + Picker + nested Menus |
| `templates/card-menu.tsx` | **no** — Menu |
| `templates/template-section.tsx` | **no** — AddMenu (Menu) |
| `workout/confirm-alert.tsx` | **no** — Alert |
| `workout/confirm-finish.tsx` | **no** — Alert |
| `workout/duration-cell.tsx` | **no** — Popover + three wheel Pickers |
| `lib/live-activity-layout.tsx` | n/a — see Step 6 |

**Good news.** Six of them already have `.web.tsx` siblings that are real
React Native implementations (`toggle-row.web.tsx` uses RN `Switch`, etc.).
Those are largely reusable for Android — the split moves from `.web` to a
shared non-iOS variant, or gains an `.android.tsx` alongside.

**The remaining six** are the actual work: two `Alert`s, three `Menu`s, and
`duration-cell`'s `Popover` + wheel picker. `@expo/ui` ships a parallel
`jetpack-compose` entrypoint with `AlertDialog`, `DropdownMenu`,
`ModalBottomSheet`, `Picker` and `Switch`, so the shapes exist — but the APIs
are not drop-in and the interaction models differ.

**iOS impact:** none. The existing `.tsx` files stay as the iOS path,
unmodified. All new code lands in siblings Metro only resolves on Android.

### Step 4 — Keyboard handling (~2–3 days)

There is currently **zero** keyboard code in `src/` — no `KeyboardAvoidingView`,
no `keyboardVerticalOffset`, no keyboard controller. iOS's native stack handles
this implicitly. On Android with `adjustResize` under a native tab bar, the set
logger's inputs end up buried behind the keyboard.

Likely wants `react-native-keyboard-controller`. Most of the work is on the
logger screen and `set-row.tsx`.

**iOS impact:** must be none — gate the new avoidance behind `Platform.OS === 'android'`
rather than adopting it globally, so iOS keeps relying on the native stack.

### Step 5 — Liquid glass / Material surfaces (~1–2 days)

`expo-glass-effect` is an iOS-only package, but its Android `GlassView` is
already a plain `View` passthrough and the call sites in
`exercise-search-bar.tsx` and `circle-button.tsx` already branch on
`isLiquidGlassAvailable()` for a fallback style. Nothing breaks — it just
renders flat.

Work is a design decision, not a bug fix: the floating search bar, the plus
button and the circle buttons need a Material-appropriate treatment (elevation,
FAB) instead of a flat capsule.

**iOS impact:** none — the existing `isLiquidGlassAvailable()` branch is what
iOS takes today and keeps taking.

### Step 6 — Live Activity (~3–5 days, or defer)

`src/lib/live-activity.tsx` and `live-activity-layout.tsx` are ActivityKit via
`expo-widgets`. That package's Android side is **Glance home-screen widgets**,
not a Live Activity — there is no equivalent.

Options:
- **Defer.** `live-activity.tsx` already returns early on `Platform.OS !== 'ios'`,
  so Android ships without it today, cleanly. Recommended for the first release.
- **Parity.** An ongoing foreground-service notification with a chronometer
  (`setUsesChronometer`), or Android 16's Live Updates / `ProgressStyle`
  notifications. Either needs a native module or a config plugin.

**iOS impact:** none — the ActivityKit path is untouched either way.

### Step 7 — Navigation chrome (~2–4 days)

- `headerLargeTitle` (used on 6 screens) is a no-op on Android. Android's
  equivalent is a `MediumTopAppBar`; decide whether to approximate or accept a
  standard header.
- `sheetAllowedDetents` (8 screens) works through react-native-screens on
  Android but behaves differently — API-level dependent, different drag-to-dismiss.
- The chained-modal architecture in `(workout)/_layout.tsx` — which documents a
  strict "never dismiss and present in the same tick" rule — needs real-device
  verification on Android.

**iOS impact:** none — these options stay set exactly as they are; Android
either ignores them or gets an added Android-only option alongside.

### Step 8 — Typography (~1 day)

`Fonts` in `src/constants/theme.ts` already has a `default` branch, but
`rounded` and `serif` fall back to `'normal'` / `'serif'` on Android. If the
visual identity leans on SF Rounded, bundle a rounded font for Android.

**iOS impact:** none — the `ios:` branch of `Platform.select` is untouched.

### Step 9 — RevenueCat / billing (~half day code, more store setup)

`src/lib/purchases.tsx` is already `Platform.OS`-keyed and warns when a key is
missing. But `app.json` currently has the **same** `test_` key for both
platforms. Needs a real Google Play billing key, Play Console products matching
the iOS offering, and a re-test of the RevenueCat-hosted paywall
(`react-native-purchases-ui`) on Android.

**iOS impact:** none — the iOS key entry is untouched.

### Step 10 — Build & release (~1–2 days)

- No `android/` dir — prebuild generates it, same as `ios/`. Keep it gitignored
  and never hand-edit; change `app.json`.
- The `with-no-aps-environment` plugin is an iOS entitlements mod and is a
  safe no-op for Android prebuild.
- EAS build profile, keystore, Play Console listing.

### Step 11 — Device QA (~3–5 days)

Spread across Android versions and screen sizes. Priority areas: the two drag
systems, the sheet stack, SQLite under Android's process death, notification
delivery with battery optimisation active.

---

## Estimate

| Scope | Effort |
| --- | --- |
| Runs, fully usable, visibly iOS-shaped (Steps 1–4, skip 6) | **~1.5–2 weeks** |
| Polished Android app that doesn't read as a port (all steps) | **~3–5 weeks** |

The architecture helps here. The project's own conventions — single resolvers
for images, one place that switches on tracking type, `.web.tsx` siblings as
the platform-divergence pattern — mean platform-specific code is already fenced
into known files rather than smeared across 35 screens. The one thing that was
never abstracted is `SymbolView`, and that is the cheapest of the four large
items to fix.

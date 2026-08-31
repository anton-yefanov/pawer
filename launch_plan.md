# Launch Plan — Pawer 1.0

App Store Connect: `Pawer Workout Tracker Gym L…` · bundle `com.antonyefanov.pawer` · team `CDG4MY328T` · Apple ID `6805974421`

---

## 1. Blockers

- [x] **Production RevenueCat key.** `extra.revenueCat.ios` is now the `appl_…` key; the `android` entry is gone (iOS-only launch — a missing key leaves `CONFIGURED` in `src/lib/purchases.tsx:38` false, the same harmless path the `test_` key took). Takes effect on the next build.
- [x] **App Group unified and native project regenerated.** Everything now says `group.com.antdream.pawer` — the identifier that actually exists on team `CDG4MY328T` (confirmed in the portal). `app.json`, both `.entitlements`, and *both* Info.plists agree; nothing in `src/` reads the id.
  - [x] `group.com.antdream.pawer` confirmed registered under Identifiers ▸ App Groups. Still to confirm on the first archive: that it is enabled on both App IDs, `com.antonyefanov.pawer` and `com.antonyefanov.pawer.ExpoWidgetsTarget`. Xcode's automatic signing normally handles this; the portal is only needed if signing fails.
  - [x] `npx expo prebuild -p ios --clean` — CocoaPods installed clean. The `--clean` matters: the earlier staleness was a non-clean prebuild leaving the old `ExpoWidgetsAppGroupIdentifier` behind in the plists.
  - [x] `SENTRY_AUTH_TOKEN` restored into `ios/sentry.properties` from `.env.local`.
  - [x] `ios/Pawer/PrivacyInfo.xcprivacy` survived: all 5 collected data types intact, `NSPrivacyTracking` false.
  - [x] `ExpoWidgetsAppGroupIdentifier` matches the entitlements in both `ios/Pawer/Info.plist` and `ios/ExpoWidgetsTarget/Info.plist` — the extension plist carries the key too, and it is the one that decides whether the Live Activity can reach the group.
  - [ ] **Regressed by the prebuild:** `NSBonjourServices` and `NSLocalNetworkUsageDescription` are back in `ios/Pawer/Info.plist` — they come from the `expo-dev-client` plugin, not `app.json`, so §2's fix can't hold them out. The dev-launcher code is excluded from a Release archive, so no local-network prompt should fire in production; strip the two keys from the plist immediately before archiving if you want them gone, but not sooner — a dev build needs them to reach Metro.

## 2. Config fixes before archiving

- [x] Add `"ITSAppUsesNonExemptEncryption": false` to `ios.infoPlist` — otherwise the export-compliance question is asked on every upload.
- [x] Remove `NSLocalNetworkUsageDescription` and `NSBonjourServices` from `ios.infoPlist`. They are dev-server keys; Expo injects them for dev builds on its own, and shipping them makes iOS prompt users with *"Pawer wants to find devices on your local network"*.
- [x] Set `cameraPermission: false` and `microphonePermission: false` on the `expo-image-picker` plugin. Both usage strings are Expo boilerplate (`"Allow $(PRODUCT_NAME) to access your camera"`) and nothing in the app uses either — `src/lib/pick-photo.ts` only opens the library.
- [x] Fix the lint error: `setState` in effect at `src/hooks/use-color-scheme.web.ts:12`. Web-only, won't block review. — replaced the hydration flag with `useSyncExternalStore`.
- [x] Clear the 3 unused-var warnings. Dropped the dead `resetOnboarding` (and the commented-out dev button that referenced it), the unused `Text` import and the unused `cancelStyle` animated style plus its now-orphaned `CANCEL_WIDTH`.
- [x] `npm run typecheck && npm run lint` clean.
- [ ] Commit the dirty files (paywall, pro-banner, icon-tile, settings, plus the fixes above) so the archive is reproducible and the uploaded source maps match a real commit.

## 3. Build and upload

- [ ] Xcode → Release, *Any iOS Device (arm64)* → Product ▸ Archive.
- [ ] Upload to App Store Connect, confirm the dSYM and source-map upload phases ran.
- [ ] Attach the build to iOS App Version 1.0.
- [ ] `CFBundleVersion` is `1` — fine for the first upload; bump it for every build after.

## 4. App Store Connect — Monetization

- [ ] In-App Purchases exist and are **Ready to Submit**: monthly, annual ($29.99, 7-day trial per the plan), lifetime.
- [ ] Each product has a localized display name, description, and a review screenshot.
- [ ] Products are in one subscription group with the right upgrade/downgrade order.
- [ ] The IAPs are **attached to version 1.0** in the submission. A 1.0 carrying a paywall with no attached IAP is the most common first-submission rejection.
- [ ] Pricing and Availability set.
- [ ] RevenueCat: the `pro` entitlement is wired to all three App Store products, and the App Store Connect shared secret / in-app purchase key is configured.
- [ ] RevenueCat paywall footer shows **price, renewal period, Terms of Use (EULA) and Privacy Policy links**. Apple requires these on the paywall itself, not just in metadata.
- [ ] Customer Center is configured (Settings ▸ Manage Subscription presents it).

## 5. App Store Connect — Metadata

- [ ] **Screenshots — currently 0 of 10.** Need 6.9" iPhone (1320 × 2868 or 1290 × 2796); the 6.5" slot on screen is the legacy size. 3–5 is normal, only the first 3 appear on install sheets. Ignore the iPad tab — `TARGETED_DEVICE_FAMILY = 1`, iPhone only.
- [ ] Description, keywords, promotional text, support URL, marketing URL. Drafts in §8.
- [ ] **Privacy Policy URL** (mandatory). Terms of Use URL, or leave blank to fall back to Apple's standard EULA.
- [ ] Age rating questionnaire.
- [ ] **App Privacy** — must match `PrivacyInfo.xcprivacy`:
  - Product interaction → analytics, not linked, not tracking (PostHog)
  - Other diagnostic data → app functionality, not linked, not tracking (Sentry)
  - Name, email address, other user content → customer support, linked, not tracking (the support sheet)
  - `NSPrivacyTracking` is false — do not declare tracking.
- [ ] App Review notes: explain the free vs Pro split so the reviewer knows what to test, and note that no account or login is required. Draft in §8.
- [ ] Sign-in required: **No**.

## 6. Pre-flight on device

- [ ] Sandbox purchase of each product completes and unlocks Pro.
- [ ] Restore Purchases finds a prior purchase on a fresh install.
- [ ] Pro survives a cold start in airplane mode (the SQLite entitlement mirror).
- [x] Live Activity appears on Lock Screen and Dynamic Island during a workout, after the prebuild. Verified on the iPhone 17 Pro simulator: banner renders with the elapsed clock and set/volume line, compact pill shows glyphs only. Signing of the App Group entitlement is still only proven by a device build or the archive.
- [ ] Onboarding runs clean on a first install (delete the app first — the seed and migrations run before any screen).
- [ ] All 412 clips play; no missing-asset Metro error (`npm run videos:pull` on a clean clone).

## 7. Submit

- [ ] Add for Review.
- [ ] Release option chosen: manual, or automatic on approval.

---

## 8. Metadata drafts

Drafted from the code, not invented: the gates are `src/lib/pro-gates.ts` and `FREE_PERIODS` in `src/lib/analytics-period.ts`. Paste and edit; the counts below are what the build actually enforces.

**Subtitle** (30 max)

> Workout tracker & gym log

**Promotional text** (170 max, editable without a new build)

> 412 exercise videos, built in. Log a set in two taps, watch your lifts on the Lock Screen, and see every PR — all offline, no account, no sign-up.

**Keywords** (100 max, comma-separated, no spaces, no words already in the name)

> gym,lifting,strength,exercise,log,tracker,fitness,training,routine,bodybuilding,sets,reps,PR,plan

**Description**

> Pawer is a workout tracker that stays out of the way. Open it, tap the set, keep lifting.
>
> EVERY EXERCISE IS A VIDEO
> 412 demonstration clips ship inside the app. No streaming, no buffering, no account — they play in airplane mode in a basement gym.
>
> LOGGING THAT KEEPS UP
> Templates for the sessions you actually run. Previous-set values are already on screen, so a working set is two taps. Rest timer with a Live Activity on the Lock Screen and Dynamic Island, so you never unlock the phone between sets.
>
> PROGRESS YOU CAN SEE
> Personal records are detected automatically and stay pinned to the workout that earned them. Volume, frequency and per-exercise history, in kilograms or pounds.
>
> YOURS, ON YOUR PHONE
> Everything is stored locally on device. No account, no login, no sync server. Analytics are anonymous and can be turned off in Settings.
>
> PAWER PRO
> Free includes full logging, unlimited workouts, your complete history, the whole exercise library, 3 templates, 3 custom exercises, and 7- and 30-day analytics.
> Pro unlocks unlimited templates, unlimited custom exercises, and every analytics range up to all-time and custom.
> Available monthly, annually, or as a one-time lifetime purchase. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the period; manage or cancel in App Store settings.

**App Review notes**

> No account, login or sign-up is required — the app opens straight into a usable state and all data is local (SQLite on device). Nothing is fetched at runtime; the app works fully with the network off.
>
> Free vs Pro, so you know what to test:
> • Free: unlimited workouts and full logging, all history, the full 412-exercise library, up to 3 custom templates, up to 3 custom exercises, analytics ranges "Last 7 days" and "Last 30 days".
> • Pro: unlimited templates, unlimited custom exercises, and the 90-day / 180-day / 1-year / all-time / custom analytics ranges.
>
> The paywall can be reached three ways: creating a 4th template, creating a 4th custom exercise, or selecting a locked analytics range. It is also shown once, unprompted, after the first finished workout. Settings ▸ Pawer Pro opens it at any time.
>
> Three in-app purchases are attached to this version: monthly, annual (7-day free trial) and a one-time lifetime unlock. Restore Purchases is in Settings.
>
> Live Activity: start a workout to see the rest timer and set count on the Lock Screen and Dynamic Island.

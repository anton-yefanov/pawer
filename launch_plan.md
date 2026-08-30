# Launch Plan — Pawer 1.0

App Store Connect: `Pawer Workout Tracker Gym L…` · bundle `com.antonyefanov.pawer` · team `CDG4MY328T` · Apple ID `6805974421`

---

## 1. Blockers

- [ ] **Production RevenueCat key.** `app.json` `extra.revenueCat` is `test_YagBgAzFucASRGNovnWGGEfCpdW`. `CONFIGURED` in `src/lib/purchases.tsx:38` is false for any non-dev build on a `test_` key, so `Purchases.configure` never runs, `isPro` is permanently false, and every `presentPaywall()` returns `'error'`. Reviewer taps the paywall → Guideline 2.1 rejection. Replace both `ios` and `android` with the `appl_…` / `goog_…` keys.
- [ ] **App Group mismatch — native project is stale.** `app.json` and both `.entitlements` say `group.com.antdream.pawer`; `ios/Pawer/Info.plist` still has `ExpoWidgetsAppGroupIdentifier = group.com.antonyefanov.pawer`. The Live Activity can't reach the group.
  - [ ] Confirm `group.com.antdream.pawer` exists on team `CDG4MY328T` in the developer portal.
  - [ ] `npx expo prebuild -p ios --clean`
  - [ ] Restore `SENTRY_AUTH_TOKEN` into `ios/sentry.properties` from `.env.local` — prebuild regenerates it without the token, and without it every production stack trace arrives unsymbolicated.
  - [ ] Verify `ios/Pawer/PrivacyInfo.xcprivacy` still holds the real manifest, not the empty template. Prebuild has silently replaced it here before. (Checked *before* the prebuild: it currently holds all 5 collected data types — so this is only a post-prebuild re-check.)
  - [ ] Verify `ExpoWidgetsAppGroupIdentifier` in the regenerated Info.plist now reads `group.com.antdream.pawer`. (Confirmed still stale at `ios/Pawer/Info.plist:44` — both `.entitlements` already say `antdream`, so the plist is the only thing left disagreeing.)

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
- [ ] Live Activity appears on Lock Screen and Dynamic Island during a workout, after the prebuild.
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

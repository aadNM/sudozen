# SudoZen

<p align="center">
  <img src="src/assets/logo1.png" alt="SudoZen logo" width="140" />
</p>

> **⚠️ Archived — no longer maintained.**
> SudoZen has been removed from the App Store and Google Play. It no longer receives updates, bug fixes or support, and its production backend is no longer guaranteed to be online. I'm publishing the source as a portfolio piece and a reference. Issues and pull requests will not be answered.

SudoZen is a cross-platform Sudoku app for iOS and Android, built with **React Native + Expo** and backed by **PocketBase**. It has four difficulty levels, a shared daily challenge, leaderboards, player statistics and streaks, an in-game strategy coach with 31 solving techniques, and a full UI in 7 languages.

For a full write-up of the architecture, features and decisions behind the project, see **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)**.

<p align="center">
  <img src="src/assets/SudoZen-featured.png" alt="SudoZen screenshots" width="720" />
</p>

## Why I built this

SudoZen was my way of learning the whole app development process, from an empty project to apps live on the App Store and Google Play, and everything in between: backend, auth, email, ads, store builds and releases.

I started with the bare React Native CLI and switched to Expo partway through. Most of the reason was CocoaPods and Xcode: pod install failures, build settings and signing issues that took far more time than the app itself. Expo's prebuild and EAS Build made native builds predictable. Another lesson I kept learning the hard way: after a `brew upgrade`, check your Node version, because a silently upgraded (or broken) Node install will break the toolchain in confusing ways.

It was tiring at times, but it taught me more than any tutorial could.

## Features

- **Four difficulties:** Easy, Medium, Hard, Extreme, each with its own hint and check limits
- **Daily Challenge:** the same seeded puzzle for every player each day, with a 1.5× score bonus
- **Scoring system:** time, hint and check penalties, plus perfect-game, speed and streak bonuses
- **Leaderboards:** by difficulty, over daily, weekly, monthly and all-time ranges
- **Statistics:** games per difficulty, average scores, best times, total play time, current and longest streaks
- **Strategy hints and tutorial:** 31 techniques, from Single Candidate to Death Blossom and Forcing Chains
- **Guest mode:** play right away with no account, and upgrade to a full account later
- **Resume games:** in-progress games are saved locally and can be resumed for 24 hours
- **7 languages:** English, Spanish, French, Dutch, Hausa, Swahili and Chinese
- **Light and dark themes,** sound effects, haptics and Lottie animations

## Tech stack

| Layer      | Technology |
|------------|------------|
| App        | React Native 0.81, Expo SDK 54, React 19, TypeScript |
| Navigation | React Navigation 7 (stack) |
| UI         | React Native Paper, Reanimated 4, Lottie |
| Backend    | PocketBase (auth, players, puzzles, scores) |
| Storage    | MMKV (fast key-value store, with an encrypted instance for sensitive data) |
| i18n       | i18next / react-i18next, expo-localization |
| Monetization | Google AdMob (banner, interstitial, rewarded) |
| Build      | EAS Build |

## Running it locally

The original backend is offline, so you need to bring your own services and credentials. None of them are in this repo.

### What you need

| What | Why | Where it goes |
|------|-----|---------------|
| `GoogleService-Info.plist` | iOS Firebase config (required by the native build) | project root |
| `google-services.json` | Android Firebase config (required by the native build) | project root |
| PocketBase server + superuser | Auth, players, puzzles, scores, leaderboards | `EXPO_PUBLIC_PB_URL`, `PB_SUPERUSER_*` in `.env` |
| SMTP2GO account + SMTP user | Account verification and password-reset emails sent by PocketBase | `SMTP2GO_*`, `MAIL_SENDER_*` in `.env` |
| AdMob app IDs *(release only)* | Ads. Dev builds use Google's test ads automatically | `app.json`, [src/utils/ads.ts](src/utils/ads.ts) |
| Expo account *(EAS builds only)* | Cloud builds and store submission | `app.json` (`owner`, `extra.eas.projectId`) |

Requires Node 20+, Xcode (iOS) and/or Android Studio (Android).

### Quick start

```bash
npm install
cp .env.example .env              # fill in values as you go through the steps below
npm run pb:dev                    # terminal 1: downloads and runs PocketBase on :8090
npm run pb:setup                  # terminal 2: creates collections + configures SMTP2GO
npm run ios                       # or: npm run android (checks your setup first)
```

Use `npm run ios` / `npm run android` rather than `npx expo run:*`, so the preflight check ([scripts/check-setup.js](scripts/check-setup.js)) runs first. Expo Go won't work: the app uses native modules and needs a development build.

### 1. Google services files (Firebase)

1. Go to the [Firebase console](https://console.firebase.google.com/) and create a project.
2. **Add an iOS app** with bundle ID `com.SudoZen.conquerdaily`. Download `GoogleService-Info.plist`.
3. **Add an Android app** with package name `com.SudoZen`. Download `google-services.json`.
4. Put both files in the project root. They are gitignored, so never commit them.

If you use your own bundle ID/package name, change `ios.bundleIdentifier` and `android.package` in [app.json](app.json) to match. If you already ran a build, regenerate the native folders with `npx expo prebuild --clean`.

### 2. PocketBase

`npm run pb:dev` ([scripts/pocketbase-dev.sh](scripts/pocketbase-dev.sh)) downloads the latest PocketBase binary for macOS/Linux into `.pocketbase/`, creates a superuser from `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`, and serves it at <http://127.0.0.1:8090> (dashboard at `/_/`). To set it up by hand instead, see the [PocketBase docs](https://pocketbase.io/docs/).

`npm run pb:setup` ([scripts/setup-pocketbase.js](scripts/setup-pocketbase.js)) logs in as the superuser and creates the `puzzles`, `daily_puzzles`, `players` (auth) and `scores` collections with the fields and API rules the app expects. It skips any collection that already exists, so you can re-run it safely. It requires PocketBase v0.23 or later.

Set `EXPO_PUBLIC_PB_URL` in `.env` to your server:
- iOS simulator / Android emulator: `http://127.0.0.1:8090` (the app rewrites it to `10.0.2.2` on Android)
- Physical phone: your computer's LAN IP, e.g. `http://192.168.1.20:8090`
- Hosted: your public HTTPS URL (e.g. on [PocketHost](https://pockethost.io/) or a VPS). Run `pb:setup` against it by setting `PB_URL`.

`EXPO_PUBLIC_*` values are bundled into the app at build time, so restart Metro (`npx expo start --clear`) after you change them. Leave `EXPO_PUBLIC_PB_ADMIN_*` empty in anything you distribute.

### 3. Email with SMTP2GO

PocketBase sends the sign-up verification and password-reset emails. Without SMTP, those emails won't be sent, but accounts still get created.

1. Sign up at [smtp2go.com](https://www.smtp2go.com/). The free tier is enough for testing.
2. **Verify a sender:** *Sending → Verified Senders*. Add a sender domain (and add the DNS records it shows) or a single sender email.
3. **Create an SMTP user:** *Sending → SMTP Users → Add SMTP User*. Copy the username and password.
4. Fill in `.env`:
   ```
   SMTP2GO_USERNAME=...
   SMTP2GO_PASSWORD=...
   MAIL_SENDER_ADDRESS=noreply@yourdomain.com   # must be the verified sender
   SMTP_TEST_TO=you@example.com                 # optional: sends a test email
   ```
5. Run `npm run pb:setup` again. It saves the SMTP settings in PocketBase (`mail.smtp2go.com:2525`, STARTTLS) and sends the test email if `SMTP_TEST_TO` is set.

You can also do this by hand in the PocketBase dashboard: *Settings → Mail settings → Use SMTP mail server*.

### 4. AdMob (release builds only)

Development builds always use Google's test ad units. The AdMob app IDs in `app.json` and the ad unit IDs in [src/utils/ads.ts](src/utils/ads.ts) are not yours (they're Google's sample app IDs and placeholder unit IDs in the public repo). To ship, create an app and ad units in [AdMob](https://admob.google.com/) and replace those IDs.

### 5. EAS builds (optional)

Run `eas init` to link the project to your own Expo account. This replaces `owner` and `extra.eas.projectId` in `app.json`. [eas.json](eas.json) reads `PB_URL_DEV`, `PB_URL_PROD`, `PB_ADMIN_EMAIL_*` and `PB_ADMIN_PWD_*`. Set them with `eas env:create`. EAS doesn't upload gitignored files, so to include the Google files in cloud builds, add an `.easignore` (a copy of `.gitignore` without the two Google services lines). When an `.easignore` exists, EAS uses it in place of `.gitignore`.

### Without a backend

The app still works offline in guest mode, using bundled puzzles and on-device generation.

## Project structure

```
App.tsx                 App entry: providers, auth/guest bootstrap
src/
  components/           GameBoard, HintModal, AnimatedOverlay
  screens/              Home, Game, Daily Challenge, Leaderboard, Stats, Tutorial, Settings, User Creation
  services/             PocketBase client, puzzles, scores, stats, guest users, saved game state
  utils/                Sudoku generator/solver, board analyzer, MMKV storage, ads, logger
  hooks/                usePuzzle, useStrategies, ad hooks
  context/              Theme and language providers
  locales/              UI translations (7 languages)
  assets/               Strategies (per language), sounds, animations, backgrounds
```

## License

All rights reserved. The source is published for viewing and reference. The SudoZen name, logo and artwork may not be reused.

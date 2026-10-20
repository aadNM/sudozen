# SudoZen: Project Overview

**SudoZen** is a Sudoku game for iOS and Android that I designed, built, shipped and ran on my own, from the first line of code to its listings on the App Store and Google Play. This document covers what the app does, how it is built, and the skills it took to get it to production.

> **In one sentence:** a production mobile game with its own backend, accounts, a daily challenge shared by all players, leaderboards, analytics-style stats, ad monetization and a 7-language UI, delivered by one person.

---

## At a glance

| | |
|---|---|
| **Role** | Solo developer and product owner: design, engineering, backend, release, monetization |
| **Platforms** | iOS (App Store) and Android (Google Play), from a single codebase |
| **Status** | Shipped to both stores; now retired and open-sourced as a portfolio piece |
| **Codebase** | ~8,300 lines of TypeScript across 8 screens, 9 services and a custom Sudoku engine |
| **Languages supported** | English, Spanish, French, Dutch, Hausa, Swahili, Chinese |
| **Core stack** | React Native · Expo · TypeScript · PocketBase · MMKV · i18next · AdMob · EAS |

---

## What the app does (non-technical)

- **Play Sudoku at four levels:** Easy, Medium, Hard and Extreme. Each level has its own scoring and its own number of hints and checks.
- **Daily Challenge:** every player in the world gets the same puzzle each day and competes for a boosted score.
- **Leaderboards:** compare scores by difficulty, for today, this week, this month or all time.
- **Personal statistics:** games played, average scores, best times, total play time, and daily streaks (current and longest).
- **Learn as you play:** a built-in coach explains 31 real Sudoku solving techniques, from beginner (Single Candidate) to expert (X-Wing, Swordfish, Death Blossom, Forcing Chains). These double as contextual hints during a game.
- **Play instantly, sign up later:** new players start as guests with no sign-up. When they're hooked, they can upgrade to a full account with an email, a generated strong password and password reset.
- **Never lose progress:** a game in progress is saved on the device and can be resumed later.
- **Made for everyone:** a full UI in 7 languages, including Hausa and Swahili, which most games skip. Light and dark themes, sound effects, haptic feedback and celebration animations.
- **Fair, opt-in monetization:** players can watch a rewarded ad to earn extra hints or checks, instead of hitting a paywall.

---

## Technical highlights

### 1. A custom Sudoku engine, built for phones
I wrote the puzzle generator and solver myself ([src/utils/SudokuUtils.ts](src/utils/SudokuUtils.ts)) rather than pulling in a library:

- **Backtracking solver with the MRV heuristic** (Minimum Remaining Values): it always branches on the cell with the fewest legal candidates, which shrinks the search tree dramatically.
- **Fast board generation:** the three diagonal 3×3 boxes are filled first (they are independent of each other), then the solver completes the grid.
- **Uniqueness checking:** cells are removed only while the puzzle still has exactly one solution. Solution counting stops early once a second solution is found, and runs under a time budget so it never freezes a mid-range phone.
- **Deterministic, seeded randomness:** a seeded random number generator (with a Fisher–Yates shuffle) lets the same seed produce the same puzzle on every device. This is what makes a global Daily Challenge possible without the server generating anything.
- **Difficulty tuning** through removal patterns and per-level removal targets.
- **Non-blocking generation:** work is scheduled off the render path so the UI stays responsive.
- **Bounded caching** with oldest-first eviction to keep memory use in check.

### 2. Resilient, offline-first puzzle delivery
[src/services/PuzzleService.ts](src/services/PuzzleService.ts) uses a layered fallback strategy so the player never sees a "can't load puzzle" screen:

1. In-memory cache, then
2. a **pre-generated queue** (3 puzzles kept ready per difficulty and refilled in the background), then
3. a server puzzle the player hasn't solved yet (filtered by puzzle ID, daily ID and content hash), then
4. on-device generation, saved back to the server in the background, then
5. a last-resort local fallback.

Network calls are wrapped in **timeouts** (`Promise.race`), and score saving uses **exponential backoff with jitter** that skips retries on non-retryable 4xx errors.

### 3. Backend and data model
- **PocketBase** (a self-hosted Go backend built on SQLite) handled authentication, players, puzzles, daily puzzles and scores.
- I designed the collections and access rules, and deployed and ran the server myself.
- A **custom auth store** keeps the PocketBase session in encrypted storage and refreshes it on launch.
- **Puzzle deduplication** by content hash, so players are never served a puzzle they have already solved.
- **Timezone-aware leaderboard ranges** (daily, weekly, monthly, all-time).
- **Streak calculation** from daily-challenge history, counting at most one completion per calendar day.
- A **remote logging endpoint** for collecting production errors from real devices.

### 4. Game design expressed in code
The scoring model in [src/screens/GameScreen.tsx](src/screens/GameScreen.tsx) balances skill, speed and help used:

- Base score per difficulty (1,000 to 10,000)
- Time penalty, capped at 50% of the base score
- **Quadratic** hint penalty: the first hint is cheap, leaning on hints is expensive
- Proportional penalty for "check" usage
- Bonuses for a perfect game (no help), beating par time, consecutive-day streaks (up to +15%), and a 1.5× multiplier for the Daily Challenge

### 5. State, storage and session management
- **MMKV** for fast synchronous key-value storage, plus a **separate encrypted MMKV instance** for sensitive data. Its encryption key is generated per device.
- **Save and resume:** game state, including the board, notes, timer, hints and checks, is serialized with a 24-hour expiry, validated on load, and migrated from older save formats.
- An **event-driven account lifecycle** (guest, then upgrade, then account deletion, then back to guest) coordinated through app-level events.

### 6. Internationalization at depth
- i18next with automatic device-language detection and an in-app language switcher.
- Not just UI strings: the **entire 31-strategy tutorial is translated** into all 7 languages.
- A normalization layer maps localized difficulty and category labels back to canonical values, so app logic stays independent of the chosen language.

### 7. Monetization done respectfully
- Google AdMob integration: banner, end-of-game interstitial, and **two separate rewarded ad units** (extra hints, extra checks).
- Custom React hooks for loading ads, retrying failed loads (up to 3 attempts) and delivering rewards.
- Development builds automatically use Google's test ad units, to stay compliant with AdMob policy.

### 8. Architecture and code quality
- **TypeScript throughout**, with shared domain types ([src/types/GameTypes.ts](src/types/GameTypes.ts)).
- Clear layering: screens → hooks → services → utilities.
- Context providers for theme and language; centralized theme tokens and typography.
- ESLint and Prettier; environment-based configuration through EAS build profiles (development, preview, production).

---

## Tech stack

| Area | Technologies |
|---|---|
| **Language** | TypeScript |
| **Mobile framework** | React Native 0.81, Expo SDK 54, React 19, Expo Dev Client |
| **Navigation** | React Navigation 7 |
| **UI and animation** | React Native Paper, Reanimated 4, Gesture Handler, Lottie, Expo Haptics, Expo Image |
| **Backend** | PocketBase (self-hosted), PocketBase JS SDK |
| **Local storage** | react-native-mmkv (plain and encrypted instances) |
| **Internationalization** | i18next, react-i18next, expo-localization |
| **Monetization** | Google Mobile Ads (AdMob) |
| **Build and release** | EAS Build, App Store Connect, Google Play Console |
| **Tooling** | ESLint, Prettier, Git |

---

## Skills demonstrated

### Technical
- Cross-platform mobile development (React Native / Expo) for iOS and Android
- Algorithm design: backtracking search, heuristics, seeded randomness, uniqueness checking
- Performance work for low-end devices: time budgets, caching, background queues, non-blocking work
- Backend and data-model design; self-hosting and running a production server
- Authentication, secure local storage and session handling
- Offline-first, fault-tolerant networking (timeouts, retries, backoff, graceful fallbacks)
- Internationalization and localization architecture
- Ad SDK integration and monetization mechanics
- Build pipelines and app store release management

### Product and non-technical
- **End-to-end ownership:** took an idea to a live product on two app stores on my own
- **Product thinking:** guest-first onboarding to reduce sign-up friction; rewarded ads instead of paywalls
- **Game design:** a scoring and streak system tuned to reward skill and bring players back daily
- **Inclusive design:** support for under-served languages (Hausa, Swahili), plus light and dark themes for accessibility and comfort
- **Teaching and content:** wrote a 31-technique Sudoku curriculum and had it translated into 7 languages
- **Compliance:** privacy policy, in-app account deletion and ad-policy compliance, as required by Apple and Google
- **Store presence:** app icons, adaptive icons, featured graphics and listing assets
- **Running a product to the end:** maintained it in production, then made a deliberate decision to retire it and publish the source

---

*SudoZen has been retired from the app stores and is no longer maintained. The code is shared as-is for reference.*

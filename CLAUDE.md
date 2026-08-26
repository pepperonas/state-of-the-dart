# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

State of the Dart is a professional dart scoring PWA with multi-user support. It consists of:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (root directory)
- **Backend**: Express + TypeScript + SQLite via better-sqlite3 (`server/` directory)

## Common Commands

### Frontend (root directory)
```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Build for production (tsc + vite build)
npm run lint         # ESLint
npm run test:run     # Run tests once
npm test             # Vitest in watch mode
npm test -- src/tests/utils/scoring.test.ts  # Single test file
npm run test:e2e     # Playwright E2E (auto-starts vite preview on :4173)
npm run test:e2e:ui  # Playwright UI mode for debugging
ANALYZE=true npm run build  # Build + emit dist/bundle-stats.html
```

### Backend (server/ directory)
```bash
cd server
npm run dev               # Start with nodemon (localhost:3001 by default; production PM2 sets 3002)
npm run build             # Compile TypeScript
npm start                 # Run compiled server
npm run create:admin      # Create admin account
npm run seed:demo         # Generate demo data
npx ts-node --transpile-only scripts/seed-test-user.ts  # E2E seed (needs DATABASE_PATH env)
```

### Deployment
```bash
bash scripts/deploy.sh  # Full deploy: build frontend + backend, scp to VPS, PM2 restart
```

### Bundle analysis
```bash
ANALYZE=true npm run build   # Emits dist/bundle-stats.html (rollup-plugin-visualizer)
```

## Architecture

### Database-First Policy
**Critical**: All persistent data MUST be stored in SQLite via API. localStorage is only a cache.
- Write operations MUST go through API (never localStorage-only)
- Read operations: API first, fallback to localStorage cache when offline
- New features that store data MUST have: DB table + API endpoint + frontend API call

**Data storage map:**
| Data | Primary Source | localStorage Cache |
|------|---------------|-------------------|
| Players, Matches, Training | DB via API | TenantStorage (sync.ts) |
| Achievements (unlocks + progress) | DB via API | TenantStorage + pending sync queue |
| Personal Bests | DB via API | TenantStorage |
| Settings | DB via API | TenantStorage |
| Auth Token (JWT) | localStorage only | N/A (correct) |
| UI state (selected tab, filters) | localStorage only | N/A (correct) |
| Active match (in-progress X01) | localStorage only | N/A (temporary) |
| ATC / Shanghai / Cricket state | localStorage only (gameStorage.ts) | N/A (48h expiry) |
| Debug Flags | DB via API (admin only) | N/A |
| Tournaments | Not persisted (React state only) | N/A (TODO) |

### Frontend State Management
React Context API with provider hierarchy in `App.tsx`:
```
AuthProvider → TenantProvider → SettingsProvider → PlayerProvider → AchievementProvider → GameProvider
```

Key contexts in `src/context/`:
- `AuthContext` - JWT auth, Google OAuth, subscription status
- `TenantContext` - Multi-tenant data isolation (profiles)
- `GameContext` - Match state, scoring logic, undo/redo, pause/resume
- `PlayerContext` - Player CRUD, stats aggregation
- `SettingsContext` - App settings, audio, theme preferences
- `AchievementContext` - Achievement tracking and notifications

Code splitting: Heavy components lazy-loaded via `React.lazy()` in `App.tsx`.

### Backend API Routes
Express routes in `server/src/routes/`, registered in `server/src/index.ts`:
- `/api/auth` - Login, register, email verification, Google OAuth, main player
- `/api/tenants` - Profile management
- `/api/players` - Player CRUD, stats, heatmaps, personal bests
- `/api/matches` - Match history, resume (supports comma-separated status filter)
- `/api/training` - Training session storage
- `/api/achievements` - Achievement sync
- `/api/payment` - Stripe integration
- `/api/admin` - User management, analytics (admin only)
- `/api/bug-reports` - Bug report tracking
- `/api/debug-flags` - Debug flag system (admin only: CRUD + status/notes)
- `/api/contact` - Contact form (rate-limited: 3/hour/IP)
- `/api/leaderboard` - Leaderboard data
- `/api/settings` - User settings persistence

**API Response Format**: Backend converts snake_case DB fields to camelCase (`startedAt`, `gameType`, etc.). Frontend always expects camelCase.

### Key Business Logic
- Scoring: `src/utils/scoring.ts` (calculateThrowScore, isBust, calculateAverage)
- Checkout suggestions: `src/data/checkoutTable.ts`
- Bot AI: `src/utils/botLogic.ts` (10 difficulty levels)
- Audio: `src/utils/audio.ts` (dart caller, 400+ sound files). **Gotcha**: `announceCheckout(legOrSetNumber, finishType)` expects the **match-scoped leg/set sequence** (1, 2, 3 …), **not** the checkout score — `gameshot/legs/{N}.mp3` says "and the Nth leg". For `'match'` the number is ignored; only `texts/gameshotandthematch.mp3` plays. `announceBust(thrownScore?)` plays the thrown score first (`caller/{N}.mp3`) and then `caller/0.mp3` ("No score").
- Heatmaps: `src/utils/heatmap.ts`
- Export: `src/utils/exportImport.ts` (CSV, XLSX, PDF, JSON). `exportMatchHistoryExcel` and `exportMatchHistoryPDF` are **async** — they `await import('xlsx')` / `import('jspdf')` internally so the libs only download on user action
- Screenshots: `src/utils/screenshot.ts` (html2canvas dynamically imported on first call; excludes z-50+ modals)
- Celebration: `src/utils/celebration.ts` (lazy-import wrapper around `canvas-confetti`; call `celebrate({ … })` — module fetches on first call, cached thereafter)
- Match reconstruction: `src/utils/matchReconstruction.ts` (rebuilds Match from API)
- Match naming: `src/utils/matchNames.ts` (deterministic names from UUID)
- Logger: `src/utils/logger.ts` (production: errors only; dev: all levels)
- Log buffer: `src/utils/logBuffer.ts` (in-memory ring buffer, 1000 entries, always active)
- Debug export: `src/utils/debugExport.ts` (formats debug flags as structured text for AI analysis)

### Material 3 Expressive Design System
The entire app is themed with a **Material 3 Expressive** token layer. **Use it for all new UI** — do not reintroduce `glass-card`, raw `bg-dark-*`/`text-white`/`text-dark-*`, or ad-hoc gradient buttons.
- **Tokens**: `src/styles/m3.css` is the single source of truth — full M3 color roles (primary / secondary / **tertiary** = vibrant purple accent / error / success + the surface-container ramp + on-colors + outline), shape scale, 5-level elevation, motion springs/easing, state-layer opacities, and the M3 type scale. Dark (default `:root`/`.modern`) + light (`.modern-light`) schemes, applied via `ThemeManager` (class on `<html>`/`<body>`). Imported in `main.tsx` **after** `index.css` so component rules win specificity ties against legacy `.modern-light` overrides.
- **Tailwind utilities** (token-backed, theme-aware): colors `bg-surface[-container[-low|-high|-highest]]`, `text-on-surface`, `text-on-surface-variant`, `bg-{primary|secondary|tertiary|success|error}-container` + `text-on-$-container`, bare roles `bg-primary`/`text-primary`/`bg-success`/`bg-tertiary`/`bg-error` (DEFAULTs added to legacy scales), `border-outline[-variant]`; radius `rounded-m3-{xs|sm|md|lg|xl|2xl|full}`; elevation `shadow-m3-{1..5}`. Type scale = **plain CSS classes** (`m3-display-*`, `m3-headline-*`, `m3-title-*`, `m3-body-*`, `m3-label-*`) — these are NOT Tailwind utilities, so `md:m3-...` responsive prefixes do NOT work.
- **Motion**: `src/utils/motion.ts` exports M3-Expressive spring configs for framer-motion (`springSpatial*` with overshoot, `springStandard*`, `effects*` no-overshoot) + presets (`enterRise`, `enterPop`, `enterDrop`, `staggerChild(i)`, `pressable`, `dialogMotion`). The app is wrapped in `<MotionConfig reducedMotion="user">` (`App.tsx`), so **every** framer animation honours `prefers-reduced-motion` automatically — no per-component guard needed. For long lists, cap the stagger delay: `staggerChild(Math.min(index, 10))`. For gesture feedback prefer `whileTap`/`whileHover` with their own transition (don't let a delayed entrance `transition` leak into the gesture).
- **State layer**: interactive primitives carry `.m3-state-layer` (a `::before` hover/press overlay tinted with `currentColor`). The `:where(.m3-state-layer) > *` rule lifts content above the overlay at **zero specificity**, so a child's own Tailwind position utility (e.g. `absolute` on a corner badge) still wins — don't fight it.

### Shared UI Components (`src/components/common/`)
M3 primitive library (barrel `src/components/common/index.ts`). **Prefer these over ad-hoc styled elements.** Each carries an M3 state layer (`.m3-state-layer`) and token colors.
- `Button` — `variant`: `filled|tonal|accent|elevated|outlined|text|danger|success`; `size`: `sm|md|lg`; `fullWidth`, `icon`, `loading`. Pill-shaped, morphs corner on press.
- `IconButton` — `variant`: `standard|filled|tonal|outlined`; requires `label` (a11y). Children = the lucide icon.
- `Fab` — extended/regular FAB (`icon`, `label?`, `color`, `size`).
- `Card` — `variant`: `filled|elevated|outlined`; `interactive` for hover/press.
- `TextField` — outlined field with `label`, leading `icon`, `error`.
- `Switch` — M3 switch (`checked`, `onChange`), thumb grows when on.
- `Select` — **the app's only dropdown.** Generic in the value type: `<Select<number> value={10} onChange={n => …} options={[{value, label, icon?, text?, disabled?}]} />`. `size`: `sm|md|lg`, `inline` to size to content, `placeholder` for "no selection". Native `<select>` is **banned** (a consistency test fails the build) — its popup is drawn by the OS, so it ignored every token, could not be themed light/dark and could not hold an icon. The menu is **portalled to `<body>` at z-60** so it escapes `overflow-x-auto` tables and dialog stacking contexts, and it re-measures on scroll/resize. Keyboard = APG combobox: arrows/Home/End move, Enter/Space commit, Escape discards, Tab leaves without committing, typing jumps by prefix.
- `Chip` — filter/assist chip (`selected`, `icon`).
- `Dialog` — scrim + spring-animated container (`open`, `onClose`, `title`, `actions`, `widthClassName`, `hideClose`); closes on scrim/Escape.
- `AnimatedNumber` — spring number transition (overdamped → no overshoot/jitter), reduced-motion aware; "tallies" to its new value. Used for in-game scores (`PlayerScore`, `ScoreInput`) and Dashboard KPIs (counts up as async data loads).
- `ErrorBoundary` — top-level React error boundary. Wraps `<App>` in `main.tsx` so a render-time throw (bad `JSON.parse` in match reconstruction, failed lazy chunk, etc.) shows an M3 recovery screen (reload / back-to-menu) instead of white-screening the PWA. The `window.error`/`unhandledrejection` handlers in `App.tsx` only log — they do NOT catch render errors, so don't remove the boundary.
- `BackButton.tsx` — canonical back button. **Always use this** for screen-level back navigation. An M3 **tonal** button with a leading `<ArrowLeft>`. In **block mode (default)** it wraps itself in a `mb-6` block so the gap to the page heading is uniform across all screens; pass **`inline`** when it sits in a flex header row / form (opts out of the wrapper — the row/form controls spacing). Override text via `label`.

### Custom Icon Set (`src/components/icons/`)
**The app renders no emoji.** `<Icon name="trophy" size={24} />` draws one of ~69 hand-built Material 3 Expressive glyphs.

Why: an emoji is a *font*, not artwork. The same glyph is Apple's glossy 3-D on a phone, Google's flat shapes on a tablet and a monochrome outline on Windows; it ignores `currentColor`, so it never followed the light/dark theme; and it cannot be aligned to a 24px grid. Before this, the interface used ~250 distinct emoji across its chrome, its 463 achievements and a ~1900-entry avatar palette.

- **`paths.ts`** — the glyphs. ⚠️ **The geometry is COMPUTED by `tools/gen-icons.py`, never typed.** Circles are actually round, polygons are trigonometric, corner radii are consistent. To change a glyph, change the generator and re-run it.
- **`emojiMap.ts`** — `iconForEmoji()` maps every emoji that ever appeared onto the closest glyph. It **never returns undefined**: unmapped input falls through Unicode-block heuristics to `target`. That guarantee is what let call sites drop their emoji entirely instead of keeping one as a fallback. It also **passes icon names straight through**, so data files can hold either form.
- **Data files hold icon NAMES** (`achievements.ts`, `botLogic.ts`, avatar palettes). Stored *user* avatars may still be emoji from older profiles — `PlayerAvatar` resolves them, so nothing breaks.
- `AvatarPicker` replaced the emoji palette with a curated set from these icons.

⚠️ **Holes are real holes** (`fill-rule="evenodd"`), never a shape painted in the background colour — that only works on one of the two themes. But evenodd cuts both ways: **two overlapping shapes XOR into a hole**, which is how `hash`, `globe` and `board` first rendered as checkerboards. Shapes that should union must not overlap; only ring-and-hole constructs may.

⚠️ `SpinnerWheel` draws on a `<canvas>`, where a React `<svg>` cannot go — it feeds the same path data to `new Path2D(...)`, so the wheel shows the identical glyph.

Pinned by `src/tests/icons/iconSet.test.tsx`, including a scan that fails if an emoji reappears in rendered code (console logs and doc comments are exempt).

### Player list ordering (`src/utils/playerOrder.ts`)
One rule, applied once in `PlayerContext` so every picker inherits it: **real accounts before bots and generated test/guest profiles; within a group, most games played first; name as a stable tiebreak.** The API returns players newest-first, which used to put a throwaway `Guest 417` and every bot above the people who actually use the app. `isGeneratedPlayer` anchors its patterns at the **start** of the name — a player called `Tom "Guest" Weber` is a real person and must not be demoted. The leaderboard applies the tier rule too, but keeps its own metric sort inside each group.

### Lazy-Loaded Heavy Modules
These modules used to ship eagerly and were extracted into their own chunks during the Sprint 1 bundle pass. Anyone touching them: keep them lazy.
- `xlsx`, `jspdf`, `jspdf-autotable` — dynamic-imported inside `exportImport.ts`
- `html2canvas` — dynamic-imported inside `screenshot.ts`
- `canvas-confetti` — dynamic-imported via `celebration.ts`
- `react-confetti` — `React.lazy` + `<Suspense>` in `GameScreen.tsx`
- `recharts` — extracted into `src/components/game/ThrowChart.tsx` (lazy in `GameScreen`) and `src/components/stats/MatchChart.tsx` (lazy in `MatchHistoryPage`)

### Type System
- Core types: `src/types/index.ts` (Match, Player, Dart, Throw, GameSettings, BugReport)
- API types: `src/types/api.ts` (typed request/response interfaces)
- Achievements: `src/types/achievements.ts`
- Personal bests: `src/types/personalBests.ts`
- Debug flags: `src/types/debugFlag.ts`

### X01 Numpad Input (`src/components/game/ScoreInput.tsx`)
- Numpad-Modus: Zahl tippen + **Enter** = Wurf-Total übernehmen UND committen in einem Schritt (kein extra OK-Klick). Race-sicher via `pendingConfirm`-Flag + `useEffect` auf `currentThrow.length` (dispatches sind async, direkter `onConfirm()`-Call würde stale state lesen).
- Edit-Modus (Dart-Slot angeklickt): Enter wird zu "Set", ersetzt nur den gewählten Dart, **kein** Auto-Commit.
- ScoreInput rendert in `GameScreen.tsx` **über** Dartboard-Helper + CheckoutSuggestion — Eingabe oberhalb sichtbar ohne Scroll.

### Game Modes
- **X01** (301/501/701) - `GameScreen.tsx` (main game screen, persisted via GameContext + API)
- **Cricket** - `CricketGame.tsx` (uses GameContext for match shell, localStorage for cricketState)
- **Around the Clock** - `AroundTheClockGame.tsx` (Hit/Miss input, standalone state with turnHistory undo)
- **Shanghai** - `ShanghaiGame.tsx` (standalone state with turnHistory undo + auto-confirm)
- **Online Multiplayer** - `OnlineMultiplayer.tsx` (WebSocket via Socket.IO, no persistence). Private rooms show Room ID with copy button; lobby has join-by-code input
- **6 Training Modes** - `TrainingScreen.tsx`

All game modes except Online Multiplayer persist state to localStorage and appear in the Resume Game screen (`/resume`). See "Game State Persistence" below.

## Critical Patterns & Pitfalls

### Achievement System Persistence
- 463 achievements defined in `src/types/achievements.ts` (frontend is source of truth for definitions)
- DB table `player_achievements` stores unlock records and progress (no FK to legacy achievements table)
- Achievement IDs use underscores (`first_180`, `ten_180s`) — legacy DB had dashes (`first-180`), don't mix
- `AchievementContext` unlock flow: save to localStorage immediately, then API call with retry (2 attempts + pending queue)
- Failed API syncs stored in `achievements_pending_sync` localStorage key, retried on next session load
- On page load: localStorage cache shown instantly, then API data merged (API wins on conflicts)
- **CRITICAL**: Progress endpoint must NOT overwrite already-unlocked achievements (checks `unlocked_at IS NOT NULL`)
- Notification cards are manually dismissed (no auto-dismiss), multiple stack vertically
- `dismissNotification(index)` — index 0 = currentNotification, index 1+ = queue items

### Achievement Scope System
Each achievement has a computed **scope** (round/leg/match/career/training/event/meta) indicating its trigger context:
- Scope is NOT stored on each achievement object — computed by `getAchievementScope()` from `METRIC_BASE_SCOPE` map
- `METRIC_BASE_SCOPE` in `src/types/achievements.ts` maps ~167 metrics to their base scope
- Priority: explicit `scope` field → streak type = career → domain-locked (training/event/meta) → count with target > 1 = career → base scope → fallback career
- `getScopeColor()` returns hex colors, `getAchievementsByScope()` filters by scope
- UI: scope filter buttons + colored scope badges on AchievementsScreen and AchievementNotification
- Self-referencing achievements (metric `achievements_unlocked`, type `special`) have target dynamically patched to `ACHIEVEMENTS.length` after array definition

### Bot System
- Bot players stored in DB like regular players (`is_bot`, `bot_level` 1-10 columns)
- Auto-play in `GameScreen.tsx` uses `useRef` for `isBotPlaying` flag (NOT useState - prevents re-render loops)
- Bot dispatches: ADD_DART -> CONFIRM_THROW -> (conditionally) NEXT_PLAYER
- **CRITICAL**: Auto-confirm useEffects MUST skip bots (`if (currentPlayer?.isBot) return`) to prevent double NEXT_PLAYER
- **CRITICAL**: On bot checkout, do NOT dispatch NEXT_PLAYER — CONFIRM_THROW already handles leg/match transition
- `isBotPlayingRef.current = false` MUST be set BEFORE `dispatch({ type: 'NEXT_PLAYER' })`

### Game Navigation
- Use `window.location.href = '/'` (hard redirect) to leave game screens, NOT `navigate('/')` from React Router
- `navigate()` doesn't work reliably due to useEffect interference during route transitions
- Applies to GameScreen, AroundTheClockGame, ShanghaiGame, CricketGame
- GameScreen uses multiple `useRef` flags: `isNavigatingAwayRef`, `forceNewGameRef`, `resumeRequestedRef`

### Standalone Game Undo Pattern (ATC, Shanghai)
- Games outside GameContext (AroundTheClockGame, ShanghaiGame) use a `turnHistory` state stack for undo
- Each confirmed throw pushes a snapshot: `{ playerId, playerIndex, darts, prevProgress, prevDarts, prevHits }`
- Undo with current darts: removes last dart from `currentDarts`, cancels auto-confirm timer
- Undo with no current darts: pops last entry from `turnHistory`, restores player state, re-loads darts into slots
- Undo button enabled: `disabled={currentDarts.length === 0 && turnHistory.length === 0}`
- Auto-confirm (300ms after 3rd dart) uses `useRef` timeout, cancelable by undo
- **CRITICAL**: `restoringRef` flag prevents auto-confirm from re-confirming restored darts. When undo restores a turn from turnHistory, set `restoringRef.current = last.darts.length === 3` (NOT unconditionally `true`) BEFORE `setCurrentDarts(last.darts)`. The flag is only cleared inside the `currentDarts.length === 3` effect — setting it while restoring a shorter turn leaves it **stuck true** and silently swallows the player's next legitimate auto-confirm.

### Standalone Game Common Features (ATC, Shanghai, Cricket)
- **SpinnerWheel**: All 3 modes show `SpinnerWheel` for random starting player when 2+ players selected. `handleStartGame` → `setPendingGamePlayers` + `setShowSpinner(true)` → `handleSpinnerComplete` reorders players → `initGame(reordered)`
- **Pause dialog**: Back button during active game shows confirmation dialog with 3 options: Pause & Leave (keeps localStorage), End Game (clears localStorage), Cancel. Uses `resume.pause_title`, `resume.pause_and_leave`, `resume.end_game` i18n keys
- **Back button styling**: Game screen back buttons must have `glass-card px-3 py-2 rounded-lg text-white` + `{t('common.back')}` label

### Game State Persistence (gameStorage.ts)
- `src/utils/gameStorage.ts` provides `saveGameState`, `loadGameState`, `clearGameState`, `getLocalGameSummaries`
- Each game type has its own localStorage key (`state-of-the-dart-atc-game`, `-shanghai-game`, `-cricket-game`)
- 48h staleness threshold — auto-cleared on load if older
- **Save**: `useEffect` watching game state, gated by `!showSetup && !showWinner`. **CRITICAL**: Never include timer-driven state (like `elapsedTime`) in save useEffect dependencies — this causes 1Hz localStorage thrashing and UI flickering. Compute elapsed time dynamically at save time instead.
- **Restore**: `useEffect([], [])` on mount — validates saved player IDs still exist in PlayerContext, discards if below minimum
- **Clear**: on `handleStartGame()` (new game) AND on game completion (winner). NOT on Back button (game stays resumable)
- `ResumeGameScreen` merges localStorage games with API matches, sorted by timestamp
- `MainMenu` badge count includes localStorage games
- Cricket restore dispatches `START_MATCH` to reinitialize GameContext, then overlays saved `cricketState`

### Database Safety
- `ON DELETE CASCADE` throughout schema - deleting a user/tenant cascades to ALL related data
- No soft-delete mechanism exists
- Master admin: `martinpaush@gmail.com` (auto-granted admin rights on DB init, never remove)

### Debug Flag & Logging System
- In-memory ring buffer (`logBuffer`) captures ALL logs regardless of environment (production included)
- Console output remains environment-gated via `logger.ts`; ring buffer is independent
- Admin users see a floating Flag button (`DebugFlagButton`) — creates a snapshot: log buffer + screenshot + browser info + game state + route
- `api.ts` `apiClient()` automatically logs all API requests/responses/errors with duration (no body logging for security). Thrown errors carry the HTTP `status` (use `err.status === 409` etc., NOT `err.response.status` which doesn't exist). On a **401 for an authenticated request** it dispatches a global `auth:unauthorized` event; `AuthContext` listens → `logout()` + redirect to `/login`, so an expired token doesn't leave the user silently failing every write.
- Global error handlers in `App.tsx` capture `window.error` and `unhandledrejection` events
- Route changes logged as `navigation` category via `RouteLogger` component
- Game events (ADD_DART, CONFIRM_THROW, etc.), achievements, and auth state changes also feed the buffer
- Admin Panel has a "Debug Flags" section with status workflow: `open → investigating → resolved/dismissed`
- "Copy for AI" button formats the entire flag (logs, state, browser info) as structured text for AI analysis

### Internationalization
- react-i18next with `de.json` and `en.json` in `src/i18n/locales/`
- Always use `t('namespace.key')` for user-facing text, never hardcode strings
- Add new translations to BOTH language files simultaneously
- Keys organized by feature: `common`, `auth`, `menu`, `game`, `players`, `stats`, `training`, `settings`, `achievements`, `resume`, `contact`, `debug`, `atc`, `online`

### UI Conventions
- **Back buttons**: use the `<BackButton>` component (`src/components/common/BackButton.tsx`) — now an M3 tonal button with a leading `<ArrowLeft>` + `t('common.back')`. Pass `label` for custom text. **Do not** inline a new back button. For compact in-game back nav, a `<Button variant="tonal" size="sm" icon={<ArrowLeft size={18}/>}>` is the accepted inline form.
- **Active/selected state**: selected/active surfaces use a **primary ring** — `ring-2 ring-[var(--m3-primary)]` (or `ring-4` for the in-game PlayerScore active player) on a `bg-surface-container-high`; unselected = `bg-surface-container border border-outline-variant`. (Pre-M3 this used `border-success-500`/`ring-success-500`.) `success`/`error` roles are reserved for win/loss + resolved/destructive status.
- **Themes**: `'modern'` (dark, default) and `'modern-light'` (light). Legacy themes auto-mapped to `'modern'`
- **Screenshots**: html2canvas excludes elements with z-index >= 50

### Mobile & Tablet Optimization
- **Horizontal scroll**: `overflow-x: hidden` on `html, body` in `index.css` — prevents any horizontal scroll globally
- **Viewport**: Use `min-h-dvh` (NOT `min-h-screen`) — adapts to mobile browser address bar
- **Safe areas**: `body` has `env(safe-area-inset-*)` padding in `index.css` for iPhone Notch/Dynamic Island/Home Indicator
- **Touch**: `touch-action: manipulation` on `*` in `index.css` — eliminates 300ms double-tap-zoom delay
- **SVGs**: Always use `viewBox` + `max-w-full h-auto` on large SVGs (e.g. Dartboard) so they scale down on narrow screens
- **Responsive patterns**: Use `sm:` breakpoint for phone→tablet transitions (e.g. `p-2 sm:p-4`, `text-xl sm:text-2xl`, `gap-1.5 sm:gap-2`)
- **Charts**: Wrap `<ResponsiveContainer>` in responsive-height divs (e.g. `<div className="h-[220px] sm:h-[300px]">`) with `height="100%"`
- **Tailwind JIT**: Never use dynamic class strings like `` `md:grid-cols-${n}` `` — use lookup objects with full class strings instead
- **Pagination**: Show max 3 page buttons (not 5) for compact mobile layout
- **Overflow**: Use `truncate` on player names, `line-clamp-2` on descriptions, `overflow-x-auto` + `min-w-[...]` on wide tables

## Website (Landing Page)

Static landing page at `website/` — separate Vite + Tailwind CSS build (not React).
- **URL**: https://stateofthedart.celox.io
- **VPS path**: `/var/www/stateofthedart-landing`
- **Build**: `cd website && npm run build`
- **Deploy**: `scp -r website/dist/* root@69.62.121.168:/var/www/stateofthedart-landing/`
- Nginx config at `/etc/nginx/sites-available/stateofthedart.celox.io` with SSL via Let's Encrypt

## Testing

### Unit / Integration (Vitest + React Testing Library)
- Specs in `src/tests/`. Setup `src/tests/setup.ts`. **294 tests**.
- Vitest is configured to exclude `e2e/**` — Playwright owns that directory.

### E2E (Playwright)
- Specs in `e2e/`. **10 tests** currently:
  - `smoke.spec.ts` — load redirect, asset-count regression guard, no-heavy-chunks-eager guard
  - `login-page.spec.ts` — form render, empty-submit validation, version footer
  - `auth.spec.ts` — real login against backend (200 + JWT), wrong password (401)
  - `main-menu.spec.ts` — post-login menu tiles, `/game?new=1` lazy-load smoke
- Runs against `vite preview` (:4173) **plus** an isolated backend (:3001) with its own SQLite DB at `server/data/e2e-test.db`. Both started by `playwright.config.ts` `webServer[]`.
- `e2e/global-setup.ts`:
  1. Rebuilds the frontend with `VITE_API_URL=http://localhost:3001` (the checked-in `.env` points at production, which would let test browsers hit the live API)
  2. Runs `server/scripts/seed-test-user.ts` — wipes the test DB, creates the verified test user **plus a tenant** (the auth middleware refuses any `/api/*` without one)
- Reusable helper: `e2e/helpers/login.ts` — `await login(page)` does the form-submit dance and waits for the 200 response.
- Workers are pinned to 1 — `vite preview` races under parallel load and the regression guards become flaky. Service workers are blocked (`serviceWorkers: 'block'`); the PWA SW would otherwise intercept requests and skew network assertions.
- Test fixtures + DB paths centralized in `e2e/fixtures.ts`.

### CI
- `.github/workflows/test.yml` — lint → Vitest (JUnit reporter) → build
- `.github/workflows/e2e.yml` — installs frontend + backend deps, builds backend, runs `npm run test:e2e`, uploads `playwright-report/` as artifact (7-day retention)
- `.github/workflows/version.yml` — manual trigger for version bumping

## Deployment

- **VPS**: `ssh root@69.62.121.168` (alias `celox`)
- **Frontend**: `/var/www/stateofthedart` (stateofthedart.com)
- **Backend**: `/var/www/stateofthedart-backend` (api.stateofthedart.com, port 3002)
- **PM2 Process**: `stateofthedart-backend`
- **DB**: `/var/www/stateofthedart-backend/data/state-of-the-dart.db`
- **Backups**: Daily at 3 AM, 7-day retention, script in `backup-db.sh`
- Deploy script creates a backup before PM2 restart
- **Frontend-only quick deploy** (when only the SPA changed, e.g. UI/audio fixes):
  ```bash
  npm run build && rsync -avz --delete dist/ celox:/var/www/stateofthedart/
  ```
  Avoids deploying uncommitted backend WIP that `scripts/deploy.sh` would pick up.

### nginx caching strategy (`/etc/nginx/sites-available/stateofthedart`)
- `/assets/*` (Vite hashed chunks/CSS) → `public, max-age=31536000, immutable` — safe forever, the hash IS the cache key.
- `/index.html` and SPA fallback `/` → `no-cache, no-store, must-revalidate` — browser always revalidates so deployed asset hashes are picked up.
- `/sw.js` + `workbox-*.js` → `no-cache` — SW updates propagate without delay.
- Previously the config had three contradictory `Cache-Control` headers on assets and **none** on HTML, which caused 404 errors on stale chunk references after deploys.

See `docs/DEPLOYMENT_VPS.md` and `docs/ARCHITECTURE.md` for details.

## CI/CD

GitHub Actions in `.github/workflows/`:
- `test.yml` — Lint + Vitest + build on every push/PR to `main`/`master`/`develop`
- `e2e.yml` — Playwright suite against frontend preview + isolated backend; uploads HTML report as artifact
- `version.yml` — Manual trigger for version bumping

## Build & Performance

### Vite config (`vite.config.ts`)
- PWA via `vite-plugin-pwa` + Workbox
  - **Precache**: `**/*.{js,css,html,svg,png,jpg,jpeg,woff,woff2}` — **mp3 deliberately excluded** (~33 MB of audio would otherwise inflate SW install). Runtime cache handles audio with CacheFirst + 30-day TTL.
  - Runtime cache rules: fonts (1 year), audio (30 days, 500 entries), `/api/players` + `/api/matches` + `/api/settings` (NetworkFirst with short timeouts)
- Terser minification (`drop_console` toggle)
- Manual chunks: `react-vendor`, `charts`, `utils`, `icons`
- Bundle analyzer: `ANALYZE=true npm run build` → `dist/bundle-stats.html` (treemap; uses gzip + brotli sizes)

### Initial bundle baseline (post Sprint 1)
- Main `index-*.js`: **~147 KB gz** (was 198 KB before Sprint 1)
- Initial wire payload (JS + CSS): **~218 KB gz**
- These are guarded by E2E regression tests (`asset-count is bounded`, `no heavy lazy chunks load on the login page`). Don't undo them — re-introducing an eager `recharts` / `xlsx` / `jspdf` / `html2canvas` / `canvas-confetti` import will fail CI.

### Versioning
- Manually edit `"version"` in `package.json` (`npm run version:bump` is broken — ESM/CJS conflict)
- Display current version: `npm run version:show`

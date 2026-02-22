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
```

### Backend (server/ directory)
```bash
cd server
npm run dev          # Start with nodemon (localhost:3002)
npm run build        # Compile TypeScript
npm start            # Run compiled server
npm run create:admin # Create admin account
npm run seed:demo    # Generate demo data
```

### Deployment
```bash
bash scripts/deploy.sh  # Full deploy: build frontend + backend, scp to VPS, PM2 restart
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
| Active match (in-progress game) | localStorage only | N/A (temporary) |
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
- `/api/contact` - Contact form (rate-limited: 3/hour/IP)
- `/api/leaderboard` - Leaderboard data
- `/api/settings` - User settings persistence

**API Response Format**: Backend converts snake_case DB fields to camelCase (`startedAt`, `gameType`, etc.). Frontend always expects camelCase.

### Key Business Logic
- Scoring: `src/utils/scoring.ts` (calculateThrowScore, isBust, calculateAverage)
- Checkout suggestions: `src/data/checkoutTable.ts`
- Bot AI: `src/utils/botAI.ts` (10 difficulty levels)
- Audio: `src/utils/audio.ts` (dart caller, 400+ sound files)
- Heatmaps: `src/utils/heatmap.ts`
- Export: `src/utils/exportImport.ts` (CSV, XLSX, PDF, JSON)
- Screenshots: `src/utils/screenshot.ts` (html2canvas, excludes z-50+ modals)
- Match reconstruction: `src/utils/matchReconstruction.ts` (rebuilds Match from API)
- Match naming: `src/utils/matchNames.ts` (deterministic names from UUID)
- Logger: `src/utils/logger.ts` (production: errors only; dev: all levels)

### Type System
- Core types: `src/types/index.ts` (Match, Player, Dart, Throw, GameSettings, BugReport)
- API types: `src/types/api.ts` (typed request/response interfaces)
- Achievements: `src/types/achievements.ts`
- Personal bests: `src/types/personalBests.ts`

### Game Modes
- **X01** (301/501/701) - `GameScreen.tsx` (main game screen)
- **Cricket** - `CricketGame.tsx`
- **Around the Clock** - `AroundTheClockGame.tsx`
- **Shanghai** - `ShanghaiGame.tsx`
- **Online Multiplayer** - `OnlineMultiplayer.tsx` (WebSocket via Socket.IO)
- **6 Training Modes** - `TrainingScreen.tsx`

## Critical Patterns & Pitfalls

### Achievement System Persistence
- 247 achievements defined in `src/types/achievements.ts` (frontend is source of truth for definitions)
- DB table `player_achievements` stores unlock records and progress (no FK to legacy achievements table)
- Achievement IDs use underscores (`first_180`, `ten_180s`) — legacy DB had dashes (`first-180`), don't mix
- `AchievementContext` unlock flow: save to localStorage immediately, then API call with retry (2 attempts + pending queue)
- Failed API syncs stored in `achievements_pending_sync` localStorage key, retried on next session load
- On page load: localStorage cache shown instantly, then API data merged (API wins on conflicts)
- **CRITICAL**: Progress endpoint must NOT overwrite already-unlocked achievements (checks `unlocked_at IS NOT NULL`)
- Notification cards are manually dismissed (no auto-dismiss), multiple stack vertically
- `dismissNotification(index)` — index 0 = currentNotification, index 1+ = queue items

### Bot System
- Bot players stored in DB like regular players (`is_bot`, `bot_level` 1-10 columns)
- Auto-play in `GameScreen.tsx` uses `useRef` for `isBotPlaying` flag (NOT useState - prevents re-render loops)
- Bot dispatches: ADD_DART -> CONFIRM_THROW -> (conditionally) NEXT_PLAYER
- **CRITICAL**: Auto-confirm useEffects MUST skip bots (`if (currentPlayer?.isBot) return`) to prevent double NEXT_PLAYER
- **CRITICAL**: On bot checkout, do NOT dispatch NEXT_PLAYER — CONFIRM_THROW already handles leg/match transition
- `isBotPlayingRef.current = false` MUST be set BEFORE `dispatch({ type: 'NEXT_PLAYER' })`

### GameScreen Navigation
- Use `window.location.href = '/'` (hard redirect) to leave GameScreen, NOT `navigate('/')` from React Router
- `navigate()` doesn't work reliably due to useEffect interference during route transitions
- Multiple `useRef` flags control navigation: `isNavigatingAwayRef`, `forceNewGameRef`, `resumeRequestedRef`

### Database Safety
- `ON DELETE CASCADE` throughout schema - deleting a user/tenant cascades to ALL related data
- No soft-delete mechanism exists
- Master admin: `martinpaush@gmail.com` (auto-granted admin rights on DB init, never remove)

### Internationalization
- react-i18next with `de.json` and `en.json` in `src/i18n/locales/`
- Always use `t('namespace.key')` for user-facing text, never hardcode strings
- Add new translations to BOTH language files simultaneously
- Keys organized by feature: `common`, `auth`, `menu`, `game`, `players`, `stats`, `training`, `settings`, `achievements`, `resume`, `contact`

### UI Conventions
- Back buttons: `glass-card` style with `<ArrowLeft size={20} />` and `t('common.back')`
- Player selection cards: centered avatar (`PlayerAvatar size="sm"`), centered name, green border when selected (`border-success-500`), container `max-w-4xl`
- Themes: `'modern'` (dark, default) and `'modern-light'` (light). Legacy themes auto-mapped to `'modern'`
- Screenshots: html2canvas excludes elements with z-index >= 50

## Testing

Tests in `src/tests/` using Vitest + React Testing Library. Setup in `src/tests/setup.ts`.

## Deployment

- **VPS**: `ssh root@69.62.121.168`
- **Frontend**: `/var/www/stateofthedart` (stateofthedart.com)
- **Backend**: `/var/www/stateofthedart-backend` (api.stateofthedart.com, port 3002)
- **PM2 Process**: `stateofthedart-backend`
- **DB**: `/var/www/stateofthedart-backend/data/state-of-the-dart.db`
- **Backups**: Daily at 3 AM, 7-day retention, script in `backup-db.sh`
- Deploy script creates a backup before PM2 restart

See `docs/DEPLOYMENT_VPS.md` and `docs/ARCHITECTURE.md` for details.

## Build Notes

- PWA config in `vite.config.ts` with Workbox caching
- Production builds drop console.log via terser
- Manual chunk splitting: react-vendor, charts, utils, icons
- Audio cached 30 days, fonts 1 year

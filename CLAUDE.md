# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

State of the Dart is a professional dart scoring PWA with multi-user support. It consists of:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express + TypeScript + SQLite (better-sqlite3)

## Common Commands

### Frontend (root directory)
```bash
npm run dev          # Start development server (localhost:5173)
npm run build        # Build for production (tsc + vite build)
npm run lint         # ESLint
npm test             # Vitest in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Vitest with UI
npm run coverage     # Generate coverage report
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

## Architecture

### Database-First Policy
**Critical**: All data is stored in SQLite via API - localStorage is only a cache for offline support.

```
PRIMARY SOURCE:   SQLite Database (via API)
CACHE LAYER:      localStorage (Offline-Support)
UI STATE:         React Context (Volatile)
```

Write operations MUST go through API. Read operations should use API first, fallback to cache when offline.

### Frontend State Management
Uses React Context API with a provider hierarchy in `App.tsx`:
```
AuthProvider → TenantProvider → SettingsProvider → PlayerProvider → AchievementProvider → GameProvider
```

Key contexts:
- `AuthContext` - JWT auth, Google OAuth, subscription status
- `TenantContext` - Multi-tenant data isolation (profiles)
- `GameContext` - Match state, scoring logic, undo/redo
- `PlayerContext` - Player CRUD, stats aggregation
- `SettingsContext` - App settings, audio preferences
- `AchievementContext` - Achievement tracking and notifications

### Code Splitting
Heavy components are lazy-loaded in `App.tsx`. Auth components load immediately, game/stats/training screens use `React.lazy()`.

### Backend API Structure
Express routes in `server/src/routes/`:
- `/api/auth` - Login, register, email verification, Google OAuth
- `/api/tenants` - Profile management
- `/api/players` - Player CRUD, stats, heatmaps
- `/api/matches` - Match history
- `/api/training` - Training session storage
- `/api/achievements` - Achievement sync
- `/api/payment` - Stripe integration
- `/api/admin` - User management (admin only)
- `/api/bug-reports` - Bug report tracking and management

Database uses SQLite with schema in `server/src/database/schema.ts`.

**API Response Format:**
- Backend converts snake_case database fields to camelCase for API responses
- Match endpoints (`/api/matches`) return:
  - `startedAt` (not `started_at`)
  - `completedAt` (not `completed_at`)
  - `gameType` (not `game_type`)
- This conversion happens in `server/src/routes/matches.ts`
- Frontend expects camelCase for all API responses

**Data Validation:**
- Stats charts validate timestamps before processing (skip matches with timestamp 0 or null)
- Implementation in `src/components/stats/StatsOverview.tsx:252-258`
- Shows helpful fallback UI when no valid data available
- Console warnings for debugging invalid timestamps

**Admin Utilities:**
- `/api/admin/fix-timestamps` - POST endpoint to repair matches with missing timestamps
- Uses earliest throw timestamp or falls back to completed_at - 30min
- Migration script available: `server/scripts/fix-match-timestamps.ts`

**Master Admin Account:**
- Email: `martinpaush@gmail.com`
- This account is automatically granted admin rights on every database initialization
- Implementation: `server/src/database/index.ts` (ensureAdminRights check)
- **Never** remove admin rights from this account
- This ensures system access even if other admin accounts are compromised

### Key Business Logic
- Scoring logic: `src/utils/scoring.ts` (calculateThrowScore, isBust, calculateAverage)
- Checkout suggestions: `src/data/checkoutTable.ts`
- Audio system: `src/utils/audio.ts` (professional dart caller with 400+ sound files)
- Heatmap generation: `src/utils/heatmap.ts`
- Export formats: `src/utils/exportImport.ts` (CSV, XLSX, PDF, JSON)
- Screenshot capture: `src/utils/screenshot.ts` (html2canvas with modal exclusion)
- **Bot system**: `src/utils/botAI.ts` (AI opponents with 10 difficulty levels)

### Bot System (AI Opponents)

**Database Schema:**
- `players` table has `is_bot` (INTEGER) and `bot_level` (INTEGER 1-10) columns
- Bot players are stored in database like regular players
- Migration runs automatically on server start

**TypeScript Interfaces:**
```typescript
// src/types/index.ts
interface Player {
  isBot?: boolean;
  botLevel?: number;  // 1-10
}

interface MatchPlayer {
  isBot?: boolean;
  botLevel?: number;
}
```

**Bot Generation:**
- `src/utils/botAI.ts` - `generateBotTurn()` creates realistic dart throws
- Difficulty levels: 1 (Neuling) → 5 (Stammspieler) → 10 (Weltklasse)
- Higher levels = better accuracy, smarter checkout attempts

**Auto-Play Logic in GameScreen.tsx:**
- useEffect triggers when `currentMatchPlayer.isBot === true`
- Uses `useRef` for `isBotPlaying` flag (NOT useState - prevents re-render loops)
- Bot dispatches ADD_DART → CONFIRM_THROW → NEXT_PLAYER
- **CRITICAL**: Auto-confirm useEffects MUST skip bots to prevent double NEXT_PLAYER dispatches
  - Auto-confirm after 3rd dart: checks `if (currentPlayer?.isBot) return`
  - Auto-checkout: checks `if (currentPlayer.isBot) return`
- `isBotPlayingRef.current = false` MUST be set BEFORE `dispatch({ type: 'NEXT_PLAYER' })`

**Common Pitfalls:**
1. ❌ Using useState for isBotPlaying causes re-render loops
2. ❌ Auto-confirm running for bots causes double NEXT_PLAYER → player gets skipped
3. ❌ Setting isBotPlaying to false AFTER dispatch causes race conditions

### Bug Report System

**Overview:**
Comprehensive bug tracking system allowing users to report issues with automatic screenshot capture and browser diagnostics.

**Database Schema:**
```sql
-- server/src/database/schema.ts
CREATE TABLE bug_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT CHECK(category IN ('gameplay', 'ui', 'audio', 'performance', 'auth', 'data', 'other')),
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
  screenshot_url TEXT,
  browser_info TEXT,  -- JSON: userAgent, screenResolution, viewport
  route TEXT,
  admin_notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  resolved_at INTEGER
);
```

**TypeScript Interfaces:**
```typescript
// src/types/index.ts
export type BugReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugReportCategory = 'gameplay' | 'ui' | 'audio' | 'performance' | 'auth' | 'data' | 'other';
export type BugReportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface BugReport {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  title: string;
  description: string;
  severity: BugReportSeverity;
  category: BugReportCategory;
  status: BugReportStatus;
  screenshotUrl?: string;
  browserInfo?: {
    userAgent: string;
    screenResolution: string;
    viewport: string;
  };
  route?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}
```

**Components:**
- `src/components/bugReport/BugReportModal.tsx` - Bug report submission form
  - Screenshot capture with html2canvas (auto-hides modals z-index >= 50)
  - Browser diagnostics auto-capture
  - Success animation after submit

- `src/components/game/GameScreen.tsx:1061-1067` - Bug report button
  - AlertTriangle icon, positioned left of Undo button
  - Opens BugReportModal with current route tracking

- `src/components/Settings.tsx:503-571` - User's bug reports section
  - List of own reports with status badges
  - Severity and category indicators
  - "Neuen Bug melden" button

- `src/components/admin/AdminPanel.tsx:486-811` - Admin management
  - Stats cards: Total, Open, In Progress, Resolved
  - Filters: Status + Severity
  - Full bug reports table with actions
  - Details modal:
    - Screenshot viewer
    - Browser info display
    - Editable admin notes (onBlur save)
    - Status update buttons
    - Delete functionality

**API Endpoints:**
```typescript
// src/services/api.ts
api.bugReports.getAll(filters?: { status?, severity? })  // Admin: all, User: own
api.bugReports.create(data)                               // Anyone authenticated
api.bugReports.getById(id)                                // Owner or admin
api.bugReports.updateStatus(id, status)                   // Admin only
api.bugReports.updateNotes(id, notes)                     // Admin only
api.bugReports.delete(id)                                 // Admin only
```

**Utilities:**
- `src/utils/screenshot.ts` - Screenshot capture with html2canvas
  - `captureScreenshot()` - Returns base64 PNG, excludes z-50+ elements
  - `getBrowserInfo()` - Auto-captures userAgent, screen, viewport

**Status Workflow:**
```
open → in_progress → resolved → closed
  ↑                     ↓
  └─────────────────────┘ (can reopen)
```

**Permissions:**
- **Users**: Create reports, view own reports only
- **Admins**: View all reports, update status, add notes, delete reports

**Common Pitfalls:**
1. ❌ Screenshot includes modal → Use z-index >= 50 for modals (auto-excluded)
2. ❌ Missing route tracking → Always pass `window.location.pathname` to modal
3. ❌ Admin notes not saving → Use onBlur event, not onChange

### Theme System

**Available Themes:**
- `'modern'` - Modern Minimalist (dark theme, default)
- `'modern-light'` - Modern Minimalist Light (bright theme)

**Type Definition:**
```typescript
// src/types/index.ts
export type AppTheme = 'modern' | 'modern-light';
```

**Implementation:**
- `src/components/ThemeManager.tsx` - Applies theme class to document root
- `src/context/SettingsContext.tsx` - Theme persistence via API
- `src/index.css` - Theme-specific CSS classes

**Theme Structure:**
```css
.modern { /* Dark theme styles */ }
.modern-light { /* Light theme styles */ }
```

**Legacy Themes:**
- `'steampunk'` (removed) - Auto-mapped to `'modern'`
- `'dark'` (deprecated) - Auto-mapped to `'modern'`

**Theme Selection UI:**
`src/components/Settings.tsx:220-274` - Theme selector with preview cards

### Main Player Feature

**Purpose:** Allows users to designate a "Main Player" whose stats are displayed on the Dashboard.

**Database Schema:**
```sql
-- server/src/database/schema.ts
ALTER TABLE users ADD COLUMN main_player_id TEXT;
```

**Backend Endpoints:**
```typescript
// server/src/routes/auth.ts
GET  /api/auth/main-player    // Get current main player ID
PUT  /api/auth/main-player    // Set main player ID (requires playerId in body)
```

**Frontend Implementation:**
- `src/components/player/PlayerManagement.tsx` - Crown button to set main player
- `src/components/dashboard/Dashboard.tsx` - Filters stats by main player
  - Stats (wins, average, 180s) show only main player's data
  - "Letzte Aktivitäten" shows ALL matches (not filtered)
  - Crown icon indicates which player is set as main

**API Client:**
```typescript
// src/services/api.ts
api.auth.getMainPlayer()           // Returns { mainPlayerId: string | null }
api.auth.setMainPlayer(playerId)   // Sets main player
```

**UI Indicators:**
- Crown icon (🏆) next to main player name in PlayerManagement
- Crown icon with player name in Dashboard header
- "Als Haupt-Profil setzen" button for non-main players

### Dashboard Features

**Recent Activities:**
- Shows last 5 completed matches from ALL players (not filtered by main player)
- Displays date + time using `formatDateTime()`: "10.01.2026, 14:30"
- Click match to open `MatchDetailModal` with full match details

**Statistics Display:**
- Filtered by main player if one is set
- Shows: Total Matches, Wins, Win Rate, Streak, Average, 180s
- Streak calculation based on consecutive wins

**Match Detail Modal:**
`src/components/dashboard/MatchDetailModal.tsx`
- Round-by-round chart (Recharts LineChart)
- Player statistics (average, highest score, 180s, checkout %)
- Leg-by-leg breakdown with winner badges
- Full match metadata (date, game type, winner)

### Internationalization (i18n)

**Overview:**
Complete multi-language support with react-i18next, currently supporting German (de) and English (en).

**Implementation:**
- `src/i18n/config.ts` - i18n configuration, language detection, fallback logic
- `src/i18n/locales/de.json` - German translations
- `src/i18n/locales/en.json` - English translations

**Language Structure:**
```json
{
  "common": { "back": "Zurück", "save": "Speichern", ... },
  "auth": { "login": "Anmelden", "register": "Registrieren", ... },
  "menu": { "main_title": "Hauptmenü", "dashboard_desc": "Übersicht & Statistiken", ... },
  "players": { "title": "Spieler", "add_player": "Spieler hinzufügen", ... },
  "game": { "game_setup": "Spiel-Einstellungen", "select_players": "Spieler auswählen", ... },
  "stats": { "statistics": "Statistiken", "overview": "Übersicht", ... },
  "training": { "training_modes": "Trainingsmodi", ... },
  "settings": { "theme": "Theme / Aussehen", "pwa_title": "Progressive Web App", ... },
  "achievements": { "unlocked": "Freigeschaltet", ... },
  "subscription": { "trial": "Testphase", ... }
}
```

**Usage in Components:**
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('menu.main_title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

**Language Switching:**
- `src/components/Settings.tsx` - Language selector dropdown
- Settings synced to database via API
- Language changes apply instantly across entire app

**Translation Coverage:**
- ✅ All navigation and back buttons
- ✅ Game setup (player selection, game settings, start game)
- ✅ Training modes (all 6 modes fully translated)
- ✅ Settings page (PWA, themes, sounds, data management)
- ✅ Player management
- ✅ Statistics and achievements
- ✅ Bug report system
- ✅ Main menu with descriptions

**Training Modes Translation:**
All training modes in `src/components/training/TrainingScreen.tsx` are fully translated:

1. **Doubles Training** (Doppel Training)
   - Title: "Doppel Training"
   - Description: "Triff Doppel {X} | Fortschritt: {X}/20"
   - Instructions: "Triff alle Doppel von D1 bis D20", "Klicke auf den Doppelring", "Fahre mit dem nächsten Doppel fort"

2. **Triples Training** (Tripel Training)
   - Title: "Tripel Training"
   - Description: "Triff Tripel {X} | Fortschritt: {X}/20"
   - Instructions: "Triff alle Tripel von T20 bis T1", "Klicke auf den Tripelring", "Fahre mit dem nächsten Tripel fort"

3. **Around the Clock** (Rund um die Uhr)
   - Title: "Rund um die Uhr"
   - Description: "Triff {X} (jedes Segment) | Fortschritt: {X}/20"
   - Instructions: "Triff alle Zahlen von 1 bis 20 in Reihenfolge", "Jedes Segment (Single, Double, Triple) zählt", "Schließe den Rundgang so schnell wie möglich ab"

4. **Checkout Training**
   - Title: "Checkout Training"
   - Description: "Checkout {X} verbleibend"
   - Instructions: "Checke die verbleibenden Punkte aus", "Muss auf einem Doppel beendet werden", "Übe gängige Checkout-Kombinationen"

5. **Bob's 27**
   - Title: "Bob's 27"
   - Description: "Punkte: {X} | Ziel: {Y}"
   - Instructions: "Starte mit 27 Punkten", "Triff die Zielzahl: +3 Punkte", "Verfehle das Ziel: -3 Punkte", "Lass deine Punkte nicht auf 0 fallen!"

6. **Score Training**
   - Title: "Score Training"
   - Description: "Erziele {X}+ in 3 Darts"
   - Instructions: "Versuche 60+ Punkte pro Wurf zu erzielen", "Ziele auf hohe Punktesegmente", "Baue Konstanz und Kraft auf"

**Common Training UI Elements:**
- Stats: "Punkte", "Versuche", "Treffer", "Genauigkeit"
- Buttons: "Verfehlt / Keine Punkte", "Bestätigen", "Zurück", "Neustart"
- Sections: "Aktueller Wurf", "Anleitung"
- Completion: "Training Abgeschlossen! 🎯", "{X} Treffer in {Y} Versuchen", "Nochmal versuchen"
- Perfect messages: "Perfekt! Alle Doppel getroffen!", "Perfekt! Alle Tripel getroffen!", "Perfekt! Voller Rundgang abgeschlossen!", "Checkout erfolgreich!"

**Important Notes:**
- Always use `t('namespace.key')` for all user-facing text
- Never hardcode German or English text directly in components
- Add new translations to both de.json and en.json simultaneously
- Keep translation keys organized by feature/section

### UI/UX Standards

**Back Button Styling:**
All back buttons across the application use consistent glass-card design:

```tsx
<button
  onClick={() => navigate('/')}
  className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
>
  <ArrowLeft size={20} />
  {t('common.back')}
</button>
```

**Standard Button Properties:**
- `mb-6` - Consistent bottom margin
- `flex items-center gap-2` - Icon and text alignment
- `glass-card` - Glassmorphism background effect
- `px-4 py-2` - Standard padding for button appearance
- `rounded-lg` - Rounded corners
- `text-white` - White text color
- `hover:glass-card-hover` - Hover state animation
- `transition-all` - Smooth transitions
- Icon size: `<ArrowLeft size={20} />` (standardized at 20)

**Applied to 18+ Components:**
All pages including Dashboard, Settings, Game, Training, Stats, Players, Achievements, Leaderboards, Admin Panel, Auth pages, etc.

**Benefits:**
- Consistent user experience across all pages
- Professional appearance with glassmorphism effect
- Clear visual hierarchy
- Accessible and recognizable navigation
- Uniform hover interactions

### Type Definitions
- Core types: `src/types/index.ts` (Match, Player, Dart, Throw, GameSettings, BugReport)
- Achievements: `src/types/achievements.ts`
- Personal bests: `src/types/personalBests.ts`

## Testing

Tests are in `src/tests/` using Vitest + React Testing Library. Setup in `src/tests/setup.ts`.

Run a single test file:
```bash
npm test -- src/tests/utils/scoring.test.ts
```

## Logging System

**Logger Implementation:**
- `src/utils/logger.ts` - Centralized logging with environment-based levels
- **Production**: Only errors are logged (performance optimization)
- **Development**: All log levels enabled (debug, info, warn, error)

**Special Methods:**
- `logger.success()` - Success messages (✅)
- `logger.gameEvent()` - Game-specific events (🎯)
- `logger.botEvent()` - Bot AI events (🤖)
- `logger.achievementEvent()` - Achievement unlocks (🏆)
- `logger.apiEvent()` - API operations (🔄)

**Usage:**
```typescript
import logger from '../utils/logger';

logger.debug('Debug information');  // Development only
logger.info('Info message');        // Development only
logger.warn('Warning');             // Development only
logger.error('Error occurred');     // Always logged
logger.success('Operation completed');  // Development only
```

**Migration Status:**
- ✅ GameContext.tsx - Fully migrated
- ✅ PlayerContext.tsx - Fully migrated
- 🔄 Other components - Use logger for new code

## Type Safety

**API Types:**
- `src/types/api.ts` - Request/Response types for all API endpoints
- Eliminates `any` types in favor of concrete interfaces
- Better IDE autocomplete and compile-time error checking

**Key Types:**
- `TenantCreateRequest`, `TenantUpdateRequest`
- `PlayerCreateRequest`, `PlayerUpdateRequest`
- `MatchCreateRequest`, `MatchUpdateRequest`
- `TrainingSessionCreateRequest`, `TrainingSessionUpdateRequest`
- `SettingsUpdateRequest`, `BugReportCreateRequest`

**Benefits:**
- Type-safe API calls
- Prevents runtime errors from incorrect data shapes
- Self-documenting API contract

## Important Notes

- PWA configuration in `vite.config.ts` with Workbox caching
- Audio files cached for 30 days, fonts for 1 year
- Production builds drop console.log via terser
- Manual chunk splitting for react-vendor, charts, utils, icons
- See `ARCHITECTURE.md` for detailed data flow diagrams

## Deployment

- **VPS IP**: `69.62.121.168`
- **Port**: `3002` (Backend)
- **Frontend**: `/var/www/stateofthedart`
- **Backend**: `/var/www/stateofthedart-backend`
- **PM2 Process**: `stateofthedart-backend`
- **URLs**: `stateofthedart.com` / `api.stateofthedart.com`

See `DEPLOYMENT_VPS.md` for details.

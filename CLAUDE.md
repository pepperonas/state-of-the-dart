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

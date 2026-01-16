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
npm run dev          # Start with nodemon (localhost:3001)
npm run build        # Compile TypeScript
npm start            # Run compiled server
npm run create:admin # Create admin account
npm run seed:demo    # Generate demo data
```

## Architecture

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
- `/api/players` - Player CRUD
- `/api/matches` - Match history and heatmaps
- `/api/training` - Training session storage
- `/api/achievements` - Achievement sync
- `/api/payment` - Stripe integration
- `/api/admin` - User management (admin only)

Database uses SQLite with schema in `server/src/database/schema.ts`.

### Key Business Logic
- Scoring logic: `src/utils/scoring.ts` (calculateThrowScore, isBust, calculateAverage)
- Checkout suggestions: `src/data/checkoutTable.ts`
- Audio system: `src/utils/audio.ts` (professional dart caller with 400+ sound files)
- Heatmap generation: `src/utils/heatmap.ts`
- Export formats: `src/utils/exportImport.ts` (CSV, XLSX, PDF, JSON)

### Type Definitions
- Core types: `src/types/index.ts` (Match, Player, Dart, Throw, GameSettings)
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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**State of the Dart** is a professional dart scoring application built with React, TypeScript, and Vite. It features multi-tenant user profiles, real-time score tracking, professional audio announcements, tournament and training modes, and a modern glassmorphism UI with dark mode support.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server on http://localhost:5173

# Building
npm run build        # TypeScript check + Vite production build to /dist

# Testing
npm test             # Run tests in watch mode (Vitest)
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run coverage     # Generate coverage report

# Code Quality
npm run lint         # Run ESLint checks
npm run preview      # Preview production build locally

# Versioning
npm run version:bump # Bump version (0.0.1 → 0.0.2, 0.0.9 → 0.1.0, 0.9.9 → 1.0.0)
npm run version:show # Show current version

# Installation
npm install          # Install all dependencies
```

## CI/CD Pipeline

### GitHub Actions Workflows

**Test Workflow** (`.github/workflows/test.yml`):
- Triggers: Push to main/master/develop, Pull Requests
- Matrix Strategy: Node.js 18.x & 20.x
- Steps:
  1. Checkout code
  2. Setup Node.js with npm cache
  3. Install dependencies (`npm ci`)
  4. Run linter (`npm run lint`)
  5. Run tests (`npm run test:run`)
  6. Build app (`npm run build`)
- Status Badge: [![Tests](https://github.com/pepperonas/state-of-the-dart/actions/workflows/test.yml/badge.svg)](https://github.com/pepperonas/state-of-the-dart/actions/workflows/test.yml)

**Version Management Workflow** (`.github/workflows/version.yml`):
- Triggers: Manual (workflow_dispatch)
- Automatically bumps version, commits, tags, and pushes

### Deployment

Deployment to https://stateofthedart.com/ via `./deploy.sh`:
```bash
./deploy.sh  # SSH to VPS, pull, build, deploy
```

## Architecture

### State Management
The application uses React Context API with five main providers:

1. **TenantContext** (`src/context/TenantContext.tsx`):
   - Multi-tenant system for isolated user profiles
   - Manages tenant creation, switching, and deletion
   - Provides TenantStorage for scoped data persistence
   - Each tenant has separate players, stats, and settings

2. **GameContext** (`src/context/GameContext.tsx`):
   - Manages match state, scoring logic, and game flow
   - Handles throw validation, bust detection, and checkout logic
   - Integrates with audio system for announcements
   - Integrates with achievement system for automatic unlocking
   - Scoped to current tenant

3. **PlayerContext** (`src/context/PlayerContext.tsx`):
   - Manages player profiles with tenant-scoped localStorage
   - Handles player statistics and preferences
   - Provides CRUD operations for players
   - Data isolated per tenant

4. **SettingsContext** (`src/context/SettingsContext.tsx`):
   - Application-wide settings (sound, display preferences)
   - Persists settings to tenant-scoped localStorage

5. **AchievementContext** (`src/context/AchievementContext.tsx`):
   - Manages 20 achievements across 6 categories
   - Tracks player progress and unlocked achievements
   - Shows notifications when achievements are unlocked
   - Integrates with export/import system

### Audio System
Professional dart announcements using actual MP3 files located in `public/sounds/`:
- `caller/` - Score announcements (0-180.mp3)
- `gameshot/legs/` - Leg checkout sounds
- `gameshot/sets/` - Set checkout sounds
- `effects/` - Game effect sounds

The audio system (`src/utils/audio.ts`) uses HTML5 Audio API with preloading and caching.

### Key Components

**Core Game:**
- **TenantSelector** - Profile selection and creation interface
- **MainMenu** - Main navigation hub with access to all features (8 menu items)
- **GameScreen** - Main game interface with dartboard, score input, and live statistics
- **Dartboard** - Interactive SVG dartboard with segment detection
- **ScoreInput** - Optimized numpad and quick score buttons (auto-confirm after 3 darts)
- **PlayerScore** - Player cards showing scores, averages, and progress
- **CheckoutSuggestion** - Real-time checkout recommendations

**Player Management:**
- **PlayerManagement** - Player CRUD operations with profile navigation
- **PlayerProfile** - Detailed player profile with personal bests, charts, and career stats
- **StatsOverview** - Comprehensive statistics with 10+ interactive charts (Recharts)
- **Leaderboard** - Ranking system with 7 categories (average, wins, 180s, etc.)

**Achievements:**
- **AchievementsScreen** - 20 achievements across 6 categories with progress tracking
- **AchievementNotification** - Animated popup notifications for unlocked achievements

**Training & Tournament:**
- **TrainingMenu** - Training modes menu
- **TrainingScreen** - 6 interactive training modes (Doubles, Triples, Around the Clock, Checkout, Bob's 27, Score Training)
- **TournamentMenu** - Tournament system menu (UI implemented, functionality pending)

**Settings:**
- **Settings** - Dark mode, sound controls, PWA installation, data management (export/import)

### Styling Approach
- Tailwind CSS with custom glassmorphism effects
- Dark mode optimized with proper text contrast (white text on dark backgrounds)
- Custom CSS classes in `src/index.css`:
  - `.glass-card` - Glassmorphism card styling
  - `.neon-green` - Neon glow effect for checkout range

### Data Persistence
- Multi-tenant data isolation using TenantStorage wrapper
- Each tenant has prefixed localStorage keys: `tenant_{id}_*`
- Global tenant list stored under `tenants`
- Current tenant stored under `currentTenant`
- Safe storage with quota exceeded error handling
- Debounced saves to reduce write operations by 90%
- Proper Date serialization/deserialization
- Export/Import functionality (JSON for all data, CSV for match history)
- Personal Bests tracking with automatic updates
- Achievement progress tracking per player
- No backend required - fully client-side application

### TypeScript Configuration
- Strict mode enabled with all checks
- Module resolution set to "bundler" for Vite
- JSX set to "react-jsx" for React 17+ transform
- `resolveJsonModule` enabled for importing package.json

### Testing
- **Framework**: Vitest (compatible with Vite)
- **Testing Library**: React Testing Library v16 (React 19 compatible)
- **Environment**: jsdom for DOM simulation
- **Coverage**: V8 provider with HTML reports
- **CI/CD**: GitHub Actions runs tests automatically on push
- **Test Files**: Located in `src/tests/` directory
  - `utils/scoring.test.ts` - Scoring logic tests (calculateThrowScore, isBust, convertScoreToDarts)
  - `utils/storage.test.ts` - TenantStorage tests (set, get, remove, clear, isolation)
- **Setup**: `src/tests/setup.ts` - Test environment configuration with localStorage mock

### Routing
- React Router v7 for client-side routing
- Routes:
  - `/` - MainMenu (home)
  - `/game` - GameScreen (active match)
  - `/players` - PlayerManagement
  - `/stats` - StatsOverview
  - `/training` - TrainingMenu
  - `/tournament` - TournamentMenu
  - `/settings` - Settings
- Protected by TenantContext (requires active tenant)

## Important Notes

### Current Features Status
1. **X01 Games** - ✅ Fully implemented with all game modes
2. **Multi-Tenant System** - ✅ Complete with profile isolation
3. **Statistics Tracking** - ✅ Real-time stats and history
4. **Audio System** - ✅ Professional dart calling (400+ files)
5. **Training Modes** - ✅ Fully implemented (6 training modes)
6. **Tournament System** - ⚠️ UI implemented, functionality pending
7. **PWA & Performance** - ✅ Service Worker, offline support, code splitting
8. **Accessibility** - ✅ WCAG 2.1 compliant, mobile-optimized

### Known Issues
1. Tournament system shows UI but doesn't manage tournaments yet
2. Large repository size due to audio files (~170MB in public/sounds)
3. Some large audio files (>2MB) not precached by Service Worker

### Performance Features
1. **Code Splitting**: React.lazy() for all routes, reduces initial bundle by ~70%
2. **Service Worker**: Workbox-powered PWA with offline support
3. **Caching Strategy**: 
   - Precache: 1240+ entries (~30MB)
   - Runtime cache: Fonts (1 year), Audio (30 days)
4. **Build Optimization**:
   - Manual chunks: react-vendor, charts, icons, utils
   - Terser minification with console removal
   - Gzip compression
5. **Mobile Optimization**:
   - Touch targets: min 44x44px
   - Viewport optimized
   - PWA installable
6. **Accessibility**:
   - WCAG 2.1 compliant
   - Skip links
   - ARIA labels
   - Reduced motion support
7. **SEO**:
   - robots.txt
   - sitemap.xml
   - Meta tags optimized

### PWA Features
1. **Installation**:
   - "App installieren" button in Settings
   - `beforeinstallprompt` event handling
   - `appinstalled` event detection
   - Display mode detection (standalone)
2. **Manifest** (`manifest.webmanifest`):
   - Standalone display mode
   - Portrait orientation
   - Theme colors (light/dark)
   - Multiple icon sizes
3. **Service Worker** (auto-generated by vite-plugin-pwa):
   - Precaching of all static assets
   - Runtime caching strategies
   - Background sync ready
   - Update notifications
4. **Offline Support**:
   - Full app functionality offline
   - Audio files cached on demand
   - Smart cache invalidation
5. **Installation Detection**:
   - Shows install button only when installable
   - Hides button after installation
   - Platform-specific instructions (iOS/Android)
6. **User Experience**:
   - Native app feeling
   - No browser UI in standalone mode
   - Fast startup (<1 second)
   - Automatic updates

### Critical Game Logic
- Double-out rule enforced by default (can be toggled in settings)
- Bust detection in `src/utils/scoring.ts`
- Checkout suggestions in `src/data/checkoutTable.ts`
- Score validation ensures no scores > 180 or invalid combinations

### Type System
The `src/types/index.ts` file contains comprehensive TypeScript definitions for:
- **Core Game Types**: Player, Match, Leg, Throw, Dart
- **Training System**: TrainingSession, TrainingResult, TrainingSettings (8 training modes defined)
- **Tournament System**: Tournament, TournamentParticipant, TournamentMatch, TournamentSettings (4 tournament types)
- **Statistics**: PlayerStats, SessionStats, comprehensive tracking
- **Achievements**: Achievement system with rarity levels
- **Settings**: AppSettings, PlayerPreferences
- **Export/Import**: Complete data portability structures

All types are fully documented and support future features.

### Audio File Requirements
The app expects specific MP3 files in `public/sounds/`. Missing files will fail silently but log warnings to console. Critical files:
- Score announcements: `/sounds/caller/{0-180}.mp3`
- Checkout sounds: `/sounds/gameshot/legs/{score}.mp3`

### State Update Patterns
- Always use dispatch actions for game state changes
- Player statistics calculated on-the-fly from throw history
- Checkout suggestions update automatically based on remaining score

## Feature Status (v0.0.1)

### ✅ Fully Implemented
- **X01 Game Modes** (301, 501, 701, 1001) - Complete with bust detection, checkout suggestions
- **Multi-Tenant System** - Profile isolation, switching, data management
- **Audio System** - 400+ professional sound files, announcements, effects
- **Training Modes** - 6 interactive modes (Doubles, Triples, Around the Clock, Checkout, Bob's 27, Score Training)
- **Achievement System** - 20 achievements across 6 categories with notifications
- **Statistics System** - 10+ interactive charts (Recharts), personal bests tracking
- **Player Profiles** - Detailed profiles with performance charts, skill radar, career timeline
- **Leaderboard** - 7 ranking categories with top 3 medals
- **Export/Import** - JSON (all data), CSV (match history)
- **PWA Support** - Installable, offline-capable, service worker caching
- **Responsive Design** - Mobile-ready, touch-optimized, WCAG 2.1 compliant
- **SEO Optimization** - Meta tags, JSON-LD, sitemap, robots.txt

### 🚧 UI Complete, Functionality Pending
- **Tournament System** - Bracket UI ready, match logic pending

### 📋 Roadmap
- **Cricket Game Mode** - Alternative game type
- **Match Replay & Analysis** - Review past matches
- **Cloud Sync** - Cross-device synchronization
- **Mobile Apps** - Native iOS/Android versions
- **Social Features** - Friend system, challenges
- **Custom Themes** - Multiple color schemes

## Recent Updates (v0.0.1)

### Latest Features (2026-01-14)
- ✨ Added Achievement System (20 achievements)
- ✨ Added Player Profile pages with personal bests
- ✨ Added Leaderboard with 7 ranking categories
- ✨ Implemented Personal Bests tracking
- ✨ Enhanced navigation with profile access
- 🎨 Improved UI consistency across all components
- 📊 Added multiple new charts and visualizations
- ⚡ Performance optimizations with lazy loading

### Previous Updates
- ✨ Complete training modes implementation
- ✨ PWA with install button and offline support
- ✨ Export/Import functionality
- ✨ Statistics with interactive charts
- 🎨 Modern, minimalist, clean theme
- 🔊 Professional audio system overhaul
- 📱 Mobile optimization
- ♿ Accessibility improvements (WCAG 2.1)
- 🔍 SEO optimization
- 🧪 Unit testing with Vitest
- 🚀 CI/CD with GitHub Actions
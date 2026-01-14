# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DartCounter Pro is a professional dart scoring application built with React, TypeScript, and Vite. It features real-time score tracking, professional audio announcements, and a dark-themed glassmorphism UI.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server on http://localhost:5173

# Building
npm run build        # TypeScript check + Vite production build to /dist

# Code Quality
npm run lint         # Run ESLint checks
npm run preview      # Preview production build locally

# Installation
npm install          # Install all dependencies
```

## Architecture

### State Management
The application uses React Context API with three main providers:

1. **GameContext** (`src/context/GameContext.tsx`):
   - Manages match state, scoring logic, and game flow
   - Handles throw validation, bust detection, and checkout logic
   - Integrates with audio system for announcements

2. **PlayerContext** (`src/context/PlayerContext.tsx`):
   - Manages player profiles with localStorage persistence
   - Handles player statistics and preferences
   - Provides CRUD operations for players

3. **SettingsContext** (`src/context/SettingsContext.tsx`):
   - Application-wide settings (sound, display preferences)
   - Persists settings to localStorage

### Audio System
Professional dart announcements using actual MP3 files located in `public/sounds/`:
- `caller/` - Score announcements (0-180.mp3)
- `gameshot/legs/` - Leg checkout sounds
- `gameshot/sets/` - Set checkout sounds
- `effects/` - Game effect sounds

The audio system (`src/utils/audio.ts`) uses HTML5 Audio API with preloading and caching.

### Key Components
- **GameScreen** - Main game interface with dartboard, score input, and statistics
- **Dartboard** - Interactive SVG dartboard with segment detection
- **ScoreInput** - Numpad and quick score buttons for score entry
- **PlayerScore** - Player cards showing scores, averages, and progress

### Styling Approach
- Tailwind CSS with custom glassmorphism effects
- Dark mode optimized with proper text contrast (white text on dark backgrounds)
- Custom CSS classes in `src/index.css`:
  - `.glass-card` - Glassmorphism card styling
  - `.neon-green` - Neon glow effect for checkout range

### Data Persistence
- Players stored in localStorage under `dartCounterPlayers`
- Settings stored in localStorage under `dartCounterSettings`
- No backend required - fully client-side application

### TypeScript Configuration
- Strict mode enabled with all checks
- Module resolution set to "bundler" for Vite
- JSX set to "react-jsx" for React 17+ transform

## Important Notes

### Known Issues
1. Tailwind PostCSS plugin warning - requires `@tailwindcss/postcss` package update
2. Large repository size due to audio files - use Git LFS for future optimization

### Critical Game Logic
- Double-out rule enforced by default (can be toggled in settings)
- Bust detection in `src/utils/scoring.ts`
- Checkout suggestions in `src/data/checkoutTable.ts`
- Score validation ensures no scores > 180 or invalid combinations

### Audio File Requirements
The app expects specific MP3 files in `public/sounds/`. Missing files will fail silently but log warnings to console. Critical files:
- Score announcements: `/sounds/caller/{0-180}.mp3`
- Checkout sounds: `/sounds/gameshot/legs/{score}.mp3`

### State Update Patterns
- Always use dispatch actions for game state changes
- Player statistics calculated on-the-fly from throw history
- Checkout suggestions update automatically based on remaining score
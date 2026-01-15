# Changelog

All notable changes to **State of the Dart** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) with custom rules:
- Patch version increments: 0.0.1 → 0.0.2
- At patch 9, minor increments: 0.0.9 → 0.1.0
- At minor 9, major increments: 0.9.x → 1.0.0

## [Unreleased]

### Added (2026-01-15)
- 📊 **Round-by-Round Chart** in Match History - Visualizes match progression with LineChart (3 darts = 1 round)
- 🏆 **Top 5 Improvements** implemented (#1-5/36):
  - **#1 Personal Bests Auto-Update** - Automatic tracking after each match completion
  - **#2 Undo Last Throw** - Button to reverse accidental score entries (already implemented)
  - **#3 Last Players Quick-Select** - Fast rematch with automatically saved player selection
  - **#4 Achievement Progress Hints** - Animated notifications when approaching achievement unlock
  - **#5 Sound Mixing** - Separate volume controls for Caller (scores/checkouts) and Effects (UI sounds)
- 🎨 **Modern Theme for TenantSelector** - Glassmorphism design consistent with main app
- 📝 **German Documentation** - Complete README.de.md translation
- 🎯 **IMPROVEMENTS.md** - Documented all 36 planned improvements with priorities

### Changed
- 🔊 **Audio System** - Added category-based volume control (Caller vs Effects)
- 🎮 **Game Setup** - Added "Letzte Spieler" quick-select button
- 📊 **Match History** - Enhanced with interactive round progression chart
- 🎯 **TenantSelector** - Updated color scheme from green/blue to primary/accent (blue/purple)

---

## [0.0.1] - 2026-01-14

### Added
- 🎯 Complete X01 game modes (301, 501, 701, 1001)
- 👥 Multi-tenant system with profile isolation
- 📊 10+ interactive charts and statistics
  - Radar Chart: Performance profile
  - Pie Chart: Win/Loss statistics
  - Line Charts: Average and checkout development
  - Bar Charts: Score distribution
  - Area Charts: Legs won/lost
  - Composed Charts: Monthly performance trends
- 🔊 Professional audio system with 400+ sound files
- 🎮 6 training modes
  - Doubles Practice
  - Triples Practice
  - Around the Clock
  - Checkout Training
  - Bob's 27
  - Score Training
- 📱 PWA support with offline functionality
- 🎨 Modern, minimalist dark theme
- ♿ WCAG 2.1 accessibility compliance
- 🔍 SEO optimization with structured data
- 📤 Export/Import functionality (JSON & CSV)
- 🧪 Unit tests with Vitest
- 🚀 Performance optimization
  - Code splitting and lazy loading
  - Service Worker caching
  - PWA installation support
- 📈 Advanced statistics tracking
  - Real-time stats during gameplay
  - Match history with detailed analysis
  - Improvement metrics and trends
  - Personal bests tracking
- 🏆 **Achievement System** (20 achievements)
  - 6 categories: First Steps, Scoring, Checkout, Training, Consistency, Special
  - 5 tiers: Bronze, Silver, Gold, Platinum, Diamond
  - Progress tracking and notifications
  - Hidden achievements
  - Points system (5-500 points per achievement)
- 👤 **Player Profiles & Leaderboard**
  - Detailed player pages with 8 personal best categories
  - Performance charts and skill radar
  - Career timeline
  - Leaderboard with 7 ranking categories
  - Top 3 medals (Gold, Silver, Bronze)
- 🔄 **Player Comparison**
  - Compare up to 4 players simultaneously
  - Radar chart with 5-dimensional skill comparison
  - Detailed stats table
  - Visual bar chart comparison
- 🎯 Interactive SVG dartboard
- 💾 Robust data management with TenantStorage
- 🌐 Multi-language support (EN/DE)

### Technical
- React 19.2 with TypeScript
- Vite 5.4 build system
- Tailwind CSS for styling
- Recharts for data visualization
- Vitest for testing
- PWA with Service Worker
- Code splitting (~70% initial bundle reduction)
- Optimized meta tags for SEO
- GitHub Actions CI/CD
- Automatic version bumping system

### Documentation
- README.md - Project overview
- CLAUDE.md - Technical documentation
- DEPLOYMENT.md - Deployment guide
- PERFORMANCE.md - Performance optimization guide
- PWA.md - PWA installation guide
- META_TAGS.md - SEO and meta tags guide
- CHARTS.md - Charts and visualization guide
- CHANGELOG.md - Version history

---

## Version History Format

Each version entry includes:
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

**Maintained by**: Martin Pfeffer (martin.pfeffer@celox.io)  
**Repository**: https://github.com/pepperonas/state-of-the-dart  
**Live App**: https://stateofthedart.com

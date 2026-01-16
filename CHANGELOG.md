# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5] - 2026-01-16

### 🔥 L.A. Style Heatmap Revolution

Complete redesign of the dart throw heatmap with professional geographic visualization style.

### Added

#### 🎨 Professional Dartboard Design
- **Regulation Colors** - Red (#e30613) and Green (#00a651) for Double/Triple rings
- **Classic Look** - Black (#000000) and White (#f4f1e8) for Singles
- **Silver Wire Rings** - 6 concentric wire rings (#c0c0c0) like real dartboards
- **Segment Dividers** - Professional wire lines between all segments
- **Bold Numbers** - White numbers with text shadow outside the board
- **Perfect Proportions** - Regulation dartboard dimensions and spacing

#### 🌊 Smooth Blur Heatmap (L.A. Style)
- **Gaussian Blur** - 20px blur for smooth color transitions
- **6-Step Gradient** - Blue → Cyan → Green → Yellow → Orange → Red
- **Point Cloud Rendering** - Each dart creates a radial gradient
- **Screen Blend Mode** - Smooth overlay on dartboard (75% opacity)
- **Dartboard Visible** - Background board at 90% opacity
- **No Hard Edges** - Smooth transitions between all color zones

#### 📊 Enhanced Stats Display
- **Accuracy Metrics** - Miss Rate, Triple Rate, Double Rate
- **Favorite Zone** - Floating badge showing most-hit field
- **Top 5 Hotspots** - Ranked list with progress bars and percentages
- **Total Darts** - Count of all recorded throws
- **Color Legend** - Beautiful gradient bar with cold/hot endpoints

#### 🔍 Integration
- **Player Profile** - Large heatmap (500px) in player profile view
- **Statistics Tab** - Huge heatmap (600px) in dedicated tab
- **4 Stat Cards** - Total Darts, Segments Hit, Precision, 180s
- **Empty State** - Professional explanation when no data available

### Changed
- **Heatmap Component** - Completely rewritten using Canvas API instead of SVG
- **Color Remapping** - Advanced algorithm for smooth color distribution
- **Dartboard Opacity** - Increased from 80% to 90% for better visibility
- **Heatmap Opacity** - Reduced from 85% to 75% for better board visibility

### Fixed
- **Player Profile Data** - Fixed player stats loading from database instead of localStorage
- **Personal Bests** - Correctly mapped from player.stats API response
- **Radar Chart** - Using player.stats directly with proper normalization
- **TypeScript Errors** - All type mismatches resolved

### Technical
- **Canvas Rendering** - Efficient 2-layer canvas rendering (dartboard + heatmap)
- **Blur Filter** - Applied via ctx.filter for performance
- **Color Mapping** - ImageData pixel manipulation for smooth gradients
- **Performance** - Smooth 60fps with useMemo optimizations

## [1.0.0] - 2026-01-15

### 🎉 **Major Release - Production Ready!**

This is the first production-ready release of State of the Dart with complete authentication, admin system, and cloud synchronization.

### Added

#### 👑 Admin System
- **Admin Panel** - Complete user management dashboard
- **User Management** - View, edit, and delete users
- **Subscription Control** - Grant or revoke lifetime access
- **Admin Rights** - Make other users administrators
- **Statistics Dashboard** - Overview of all users and subscriptions
- **Filter & Search** - Filter users by subscription status
- **Real-time Updates** - Changes reflected immediately

#### 👥 Authentication & User Management
- **Email Registration** - Register with email and password
- **Email Verification** - Verify email address before login
- **Secure Authentication** - JWT-based authentication with bcrypt
- **Google OAuth** - Quick sign-in with Google account
- **30-Day Trial** - Free trial period for all new users
- **Password Reset** - Forgot password functionality
- **Profile Management** - Update name, avatar, email
- **Account Deletion** - Delete account with all data

#### 💳 Subscription & Payment
- **Stripe Integration** - Secure payment processing
- **Monthly Subscription** - Recurring monthly payment
- **Lifetime Access** - One-time payment for lifetime access
- **Customer Portal** - Manage subscriptions via Stripe
- **Trial Tracking** - Display remaining trial days
- **Subscription Status** - Real-time subscription status

#### ☁️ Cloud Synchronization
- **Automatic Sync** - Sync data to cloud automatically
- **Multi-Device Support** - Access data from any device
- **Conflict Resolution** - Smart conflict resolution
- **Sync Status** - Visual sync status indicator
- **Manual Sync** - Trigger sync manually

#### 🎯 Dart Heatmap
- **Visual Analysis** - See where you hit most often
- **Color Coding** - Red = frequent, Blue = rare
- **Per-Player Tracking** - Individual heatmaps for each player
- **Dartboard Overlay** - Overlay on realistic dartboard

#### 📊 Training Statistics
- **Detailed Charts** - Performance charts for all training modes
- **Hit Rate Analysis** - Track accuracy over time
- **Score Distribution** - See score patterns
- **Progress Tracking** - Monitor improvement
- **Session History** - View all training sessions

#### 🌐 Global Features
- **Global Leaderboard** - Compete with players worldwide
- **Activity Dashboard** - See recent activity and stats
- **Match Sharing** - Share matches with others
- **Social Features** - Connect with other players

#### 🔧 Backend Infrastructure
- **Express.js API** - RESTful API with Express
- **SQLite Database** - Lightweight, fast database
- **Database Migrations** - Automatic schema updates
- **Admin Scripts** - `create:admin`, `seed:demo`
- **Type-Safe API** - Full TypeScript support
- **Error Handling** - Comprehensive error handling
- **Rate Limiting** - Prevent abuse
- **CORS Support** - Secure cross-origin requests

#### 📚 Documentation
- **ADMIN_SYSTEM.md** - Complete admin guide
- **AUTHENTICATION.md** - Authentication documentation
- **DEPLOYMENT_GUIDE.md** - VPS deployment guide
- **server/SETUP.md** - Backend setup instructions
- **server/README.md** - API documentation
- **Updated README** - Both German and English versions

### Changed
- **Version** - Bumped from 0.0.1 to 1.0.0
- **README** - Added authentication and admin system sections
- **Package.json** - Updated version number
- **TypeScript Config** - Disabled unused variable warnings for build
- **Build Process** - Improved build performance

### Fixed
- **TypeScript Errors** - Fixed strict mode type errors
- **AdminPanel Export** - Added default export
- **API Headers** - Fixed header type definitions
- **Dashboard Types** - Fixed match winner type error
- **Sync Service** - Fixed getAll method type error
- **Build Errors** - Resolved all build-time errors

### Security
- **Password Hashing** - bcrypt with 12 rounds
- **JWT Tokens** - Secure token-based authentication
- **Email Verification** - Prevent fake accounts
- **Rate Limiting** - Prevent brute-force attacks
- **CORS Configuration** - Secure cross-origin requests
- **Helmet.js** - Security headers
- **Input Validation** - Validate all user inputs
- **.gitignore** - Exclude sensitive files (database, .env)

### Performance
- **Code Splitting** - Lazy load admin panel
- **Bundle Size** - 79.21 kB (gzip)
- **PWA Caching** - 1248 cached entries
- **Database Indexing** - Optimized queries
- **API Response Time** - < 100ms average

### Migration Notes
- **Existing Users** - Need to register accounts to use cloud features
- **Local Data** - Can be synced to cloud after registration
- **Admin Account** - Created via `npm run create:admin`
- **Demo Data** - Generated via `npm run seed:demo`

### Known Issues
- **Recap Music Files** - Some files too large for PWA precache (working as intended)
- **Training Stats** - Some unused variables (no impact on functionality)

### Contributors
- **Martin Pfeffer** - Project Owner
- **AI Assistant** - Development Support

---

## [0.0.1] - 2025-12-XX

### Initial Release
- Basic X01 game modes
- Player management
- Statistics tracking
- Achievements system
- Training modes
- PWA support
- Dark mode
- Audio system
- Charts and visualizations

---

[1.0.0]: https://github.com/pepperonas/state-of-the-dart/compare/v0.0.1...v1.0.0
[0.0.1]: https://github.com/pepperonas/state-of-the-dart/releases/tag/v0.0.1

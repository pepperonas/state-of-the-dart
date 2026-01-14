# 🎯 State of the Dart

**Professional Dart Scoring System** - A feature-rich, web-based dart scoring application with multi-user support, professional statistics tracking, and live deployment.

[![Live Demo](https://img.shields.io/badge/Live-stateofthedart.com-green)](https://stateofthedart.com)
![React](https://img.shields.io/badge/React-19.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-5.4-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-blue)

🌐 **[Live App](https://stateofthedart.com)** | 📖 **[Deployment Guide](DEPLOYMENT.md)** | 🐛 **[Report Issues](https://github.com/pepperonas/state-of-the-dart/issues)**

---

## ✨ Features

### 👥 Multi-Tenant System
- **Personal Profiles** - Each player has their own isolated profile with separate data
- **Profile Management** - Easy switching between profiles with visual avatars
- **Data Isolation** - Complete separation of stats, settings, and game history
- **Unlimited Profiles** - Create as many profiles as needed

### 🎮 Game Modes
- **X01 Games** - Full support for 301/501/701/1001 with customizable settings
- **Double Out/In** - Configurable checkout rules
- **Best of Sets/Legs** - Tournament-style match formats
- **Multi-player** - Support for 2+ players with custom avatars and names
- **Continue Match** - Resume interrupted games automatically

### 📊 Advanced Statistics
- **Real-Time Stats** - Live scoring with instant calculations
- **Player Statistics** - Average, checkout %, high scores, 180s, 171+, 140+, 100+
- **Match History** - Complete tracking of all games played
- **Personal Bests** - Track highest checkouts, best averages, 9-darters
- **Automatic Sync** - Stats updated automatically after each match

### 🔊 Professional Audio System
- **Score Announcements** - Professional caller voice for every score (0-180)
- **Checkout Calls** - Special announcements for leg/set/match wins
- **Bust Notifications** - Clear audio feedback for invalid throws
- **400+ Audio Files** - Complete professional dart calling experience
- **Volume Control** - Adjustable volume and mute options

### 🎨 Modern UI/UX
- **Dark Mode Optimized** - High-contrast design with perfect readability
- **Glassmorphism Design** - Modern, sleek interface with blur effects
- **Responsive Layout** - Works on desktop, tablet, and mobile devices
- **Smooth Animations** - Framer Motion powered transitions and effects
- **Confetti Celebrations** - Visual feedback for 180s and wins

### 💾 Robust Data Management
- **Safe localStorage** - Error handling for quota exceeded scenarios
- **Debounced Saving** - 90% reduction in storage writes
- **Date Handling** - Correct serialization/deserialization
- **Auto-Recovery** - Graceful fallback when storage fails
- **Tenant Isolation** - Complete data separation per profile

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/pepperonas/state-of-the-dart.git
cd state-of-the-dart

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

### Deploy to Production

```bash
# Deploy to VPS (requires SSH access)
./deploy.sh
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.

---

## 🎯 How to Use

### 1. Create Your Profile
- On first launch, you'll see the profile selector
- Click "Neues Profil erstellen"
- Choose an avatar and enter your name
- Your profile is created and activated

### 2. Start a Game
- Click "Quick Game" from the main menu
- Select players (or create new ones on the fly)
- Choose game settings (501, legs to win, double-out)
- Click "Start Game"

### 3. Play
- Use the numpad or quick score buttons to enter scores
- Click dartboard segments for precise dart entry
- Confirm throws with the OK button
- Audio announcements guide you through the game

### 4. View Statistics
- Click "Statistics" from the main menu
- View your personal stats, averages, and achievements
- All data is saved and synced automatically

### 5. Switch Profiles
- Click "Profil wechseln" in the main menu or settings
- Select a different profile to view their data
- Each profile has completely separate statistics

---

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 5.4 with optimized production builds
- **Styling**: Tailwind CSS with custom glassmorphism
- **State Management**: React Context API with useReducer
- **Routing**: React Router v7
- **Animations**: Framer Motion
- **Storage**: TenantStorage (multi-tenant localStorage wrapper)
- **Deployment**: Nginx on VPS with Let's Encrypt SSL

### Project Structure
```
state-of-the-dart/
├── public/
│   └── sounds/              # Professional audio files (400+)
│       ├── caller/          # Score announcements (0-180)
│       ├── gameshot/        # Checkout sounds
│       └── effects/         # Game effects
├── src/
│   ├── components/
│   │   ├── game/           # Game components (GameScreen, ScoreInput)
│   │   ├── dartboard/      # Dartboard visualization
│   │   ├── stats/          # Statistics overview
│   │   ├── player/         # Player management
│   │   └── TenantSelector.tsx  # Profile selection
│   ├── context/
│   │   ├── TenantContext.tsx    # Multi-tenant management
│   │   ├── GameContext.tsx      # Game state & logic
│   │   ├── PlayerContext.tsx    # Player management
│   │   └── SettingsContext.tsx  # App settings
│   ├── data/
│   │   └── checkoutTable.ts    # Checkout combinations
│   ├── types/
│   │   └── index.ts           # TypeScript definitions
│   └── utils/
│       ├── scoring.ts         # Game logic & validation
│       ├── storage.ts         # Safe localStorage wrapper
│       └── audio.ts           # Audio system
├── deploy.sh              # Deployment script
├── DEPLOYMENT.md          # Deployment documentation
└── package.json
```

### Key Implementation Details

#### Multi-Tenant System
- **TenantStorage** - Wrapper around localStorage with tenant prefix
- **TenantContext** - Manages current profile and profile switching
- **Data Isolation** - All contexts scope data by tenant ID
- **Profile Management** - Create, switch, and delete profiles safely

#### Score Validation
- **Bust Detection** - Validates throws against double-out rules
- **Bogey Numbers** - Detects impossible checkouts (169, 168, 166, etc.)
- **Checkout Suggestions** - Real-time suggestions for 2-170
- **Score Distribution** - Tracks and validates all score patterns

#### Data Persistence
- **Safe Storage** - Error handling for quota exceeded
- **Debounced Writes** - Reduces storage operations by 90%
- **Date Revival** - Proper serialization of Date objects
- **Auto-Recovery** - Fallback when storage fails

---

## 🎨 Customization

### Adding New Game Modes
Extend the `GameType` enum in `src/types/index.ts` and implement scoring logic in `src/utils/scoring.ts`.

### Custom Themes
Modify Tailwind configuration in `tailwind.config.js` and update CSS variables in `src/index.css`.

### Audio Packs
Replace MP3 files in `public/sounds/` with your own recordings maintaining the same file structure.

---

## 📝 Development

```bash
# Run development server with hot reload
npm run dev

# Run linter
npm run lint

# Type checking (included in build)
npm run build

# Preview production build locally
npm run preview
```

### Development Tips
- Use React DevTools for debugging context
- Check browser console for storage warnings
- Test with multiple profiles to verify isolation
- Use network throttling to test slow connections

---

## 🚀 Deployment

The app is currently deployed at **https://stateofthedart.com**

### Quick Deploy
```bash
./deploy.sh
```

### Manual Deploy
```bash
# Build
npm run build

# Upload to VPS
rsync -avz --progress --delete dist/ root@YOUR_VPS:/var/www/stateofthedart/

# Reload Nginx
ssh root@YOUR_VPS "nginx -s reload"
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide including:
- VPS setup
- Nginx configuration
- SSL certificate setup
- Troubleshooting

---

## 🐛 Known Issues & Limitations

- Audio files require HTTPS in production (browser security)
- localStorage limited to ~5-10MB per origin
- No backend - all data stored client-side
- No cross-device sync (each device has separate profiles)

---

## 🔜 Roadmap

- [ ] Training modes (Around the Clock, Bob's 27, etc.)
- [ ] Tournament system (Knockout, Round Robin)
- [ ] Cricket game mode
- [ ] Match replay and analysis
- [ ] Export/Import data (JSON)
- [ ] Cloud sync (optional backend)
- [ ] Mobile apps (React Native)
- [ ] Live multiplayer (WebRTC)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Use TypeScript strict mode
- Follow React Hooks best practices
- Write meaningful commit messages
- Add JSDoc comments for complex functions

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Professional dart calling audio system
- React and Vite communities for amazing tools
- Tailwind CSS for the styling framework
- All dart players who tested and provided feedback

---

## 📞 Contact

**Martin Pfeffer**  
- Website: [celox.io](https://celox.io)
- Email: martin.pfeffer@celox.io
- GitHub: [@pepperonas](https://github.com/pepperonas)

**Project Links**  
- Live Demo: [stateofthedart.com](https://stateofthedart.com)
- Repository: [github.com/pepperonas/state-of-the-dart](https://github.com/pepperonas/state-of-the-dart)
- Issues: [Report a Bug](https://github.com/pepperonas/state-of-the-dart/issues)

---

<p align="center">
  <strong>Made with ❤️ for dart players worldwide</strong><br>
  <sub>© 2026 Martin Pfeffer | celox.io</sub>
</p>

<p align="center">
  <a href="https://stateofthedart.com">
    <img src="https://img.shields.io/badge/Try_it_now-stateofthedart.com-green?style=for-the-badge" alt="Try it now">
  </a>
</p>

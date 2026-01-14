# 🎯 DartCounter Pro

**Professional Dart Scoring Application** - A feature-rich, web-based dart scoring system with professional audio announcements and real-time statistics tracking.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Vite](https://img.shields.io/badge/Vite-5.4-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🎮 Game Modes
- **X01 Games** - Full support for 301/501/701 with customizable settings
- **Double Out/In** - Configurable checkout rules
- **Best of Sets/Legs** - Tournament-style match formats
- **Multi-player** - Support for 2+ players with custom avatars and names

### 📊 Real-Time Statistics
- **Live Scoring** - Instant score calculation and remaining points display
- **Player Statistics** - Average, checkout percentage, high scores
- **180 Counter** - Track and celebrate maximum scores
- **Checkout Suggestions** - Professional checkout combinations for every score

### 🔊 Professional Audio System
- **Score Announcements** - Professional caller voice for every score (0-180)
- **Checkout Calls** - Special announcements for leg/set/match wins
- **Bust Notifications** - Clear audio feedback for invalid throws
- **400+ Audio Files** - Complete professional dart calling experience

### 🎨 Modern UI/UX
- **Dark Mode Optimized** - High-contrast design with perfect readability
- **Glassmorphism Design** - Modern, sleek interface with blur effects
- **Responsive Layout** - Works on desktop, tablet, and mobile devices
- **Smooth Animations** - Framer Motion powered transitions and effects
- **Confetti Celebrations** - Visual feedback for 180s and wins

### 📱 Progressive Web App
- **Offline Capable** - Works without internet connection
- **Local Storage** - All data persisted locally
- **Installable** - Add to home screen on mobile devices
- **Fast Loading** - Optimized Vite build with code splitting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/pepperonas/dart4friends.git
cd dart4friends

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

## 🎯 How to Play

1. **Setup Players**
   - Click "Quick Game" from the main menu
   - Add players with custom names and emoji avatars
   - Select game format (501, 301, etc.) and rules

2. **Score Entry**
   - Use the numpad or quick score buttons
   - Click dartboard segments for precise dart entry
   - Confirm throws with the OK button

3. **Game Flow**
   - Scores are automatically calculated and validated
   - Professional audio announcements for every throw
   - Checkout suggestions appear when in finishing range
   - Automatic turn switching and winner detection

## 🏗️ Technical Architecture

### Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS with custom glassmorphism
- **State Management**: React Context API with useReducer
- **Routing**: React Router v7
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Project Structure
```
dart-counter/
├── public/
│   └── sounds/          # Professional audio files
│       ├── caller/      # Score announcements (0-180)
│       ├── gameshot/    # Checkout sounds
│       └── effects/     # Game effects
├── src/
│   ├── components/      # React components
│   │   ├── game/       # Game-related components
│   │   └── dartboard/  # Dartboard visualization
│   ├── context/        # State management
│   ├── data/           # Game data and rules
│   ├── types/          # TypeScript definitions
│   └── utils/          # Helper functions
└── package.json
```

### Key Features Implementation

#### Audio System
- HTML5 Audio API with preloading and caching
- 400+ professional MP3 files for authentic experience
- Configurable volume and mute options

#### Score Validation
- Automatic bust detection for invalid throws
- Double-out enforcement
- Maximum score validation (180)

#### Data Persistence
- Player profiles saved to localStorage
- Game settings remembered between sessions
- No backend required - fully client-side

## 🎨 Customization

### Adding New Game Modes
Extend the `GameType` enum in `src/types/index.ts` and implement scoring logic in `src/utils/scoring.ts`.

### Custom Themes
Modify Tailwind configuration in `tailwind.config.js` and update CSS variables in `src/index.css`.

### Audio Packs
Replace MP3 files in `public/sounds/` with your own professional recordings maintaining the same file structure.

## 📝 Development

```bash
# Run development server
npm run dev

# Run linter
npm run lint

# Type checking
npm run build  # Includes TypeScript compilation

# Preview production build
npm run preview
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Professional dart calling audio system
- React and Vite communities
- Tailwind CSS for the styling framework
- All contributors and dart enthusiasts

## 📞 Contact

**Martin Pfeffer** - [celox.io](https://celox.io)

Project Link: [https://github.com/pepperonas/dart4friends](https://github.com/pepperonas/dart4friends)

---

<p align="center">Made with ❤️ for dart players worldwide</p>
<p align="center">© 2026 Martin Pfeffer | celox.io</p>
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { PlayerProvider } from './context/PlayerContext';
import { SettingsProvider } from './context/SettingsContext';
import MainMenu from './components/MainMenu';
import GameScreen from './components/game/GameScreen';
import PlayerManagement from './components/player/PlayerManagement';
import StatsOverview from './components/stats/StatsOverview';
import TrainingMenu from './components/training/TrainingMenu';
import TournamentMenu from './components/tournament/TournamentMenu';
import Settings from './components/Settings';
import './index.css';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  return (
    <SettingsProvider>
      <PlayerProvider>
        <GameProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
              <Routes>
                <Route path="/" element={<MainMenu />} />
                <Route path="/game" element={<GameScreen />} />
                <Route path="/players" element={<PlayerManagement />} />
                <Route path="/stats" element={<StatsOverview />} />
                <Route path="/training" element={<TrainingMenu />} />
                <Route path="/tournament" element={<TournamentMenu />} />
                <Route path="/settings" element={<Settings darkMode={darkMode} setDarkMode={setDarkMode} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </GameProvider>
      </PlayerProvider>
    </SettingsProvider>
  );
}

export default App;
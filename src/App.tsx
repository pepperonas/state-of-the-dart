import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from './context/TenantContext';
import { GameProvider } from './context/GameContext';
import { PlayerProvider } from './context/PlayerContext';
import { SettingsProvider } from './context/SettingsContext';
import { AchievementProvider } from './context/AchievementContext';
import TenantSelector from './components/TenantSelector';
import MainMenu from './components/MainMenu';
import AchievementNotification from './components/achievements/AchievementNotification';
import './index.css';

// Lazy load heavy components
const GameScreen = lazy(() => import('./components/game/GameScreen'));
const PlayerManagement = lazy(() => import('./components/player/PlayerManagement'));
const PlayerProfile = lazy(() => import('./components/player/PlayerProfile'));
const StatsOverview = lazy(() => import('./components/stats/StatsOverview'));
const TrainingMenu = lazy(() => import('./components/training/TrainingMenu'));
const TrainingScreen = lazy(() => import('./components/training/TrainingScreen'));
const TournamentMenu = lazy(() => import('./components/tournament/TournamentMenu'));
const Settings = lazy(() => import('./components/Settings'));
const AchievementsScreen = lazy(() => import('./components/achievements/AchievementsScreen'));
const Leaderboard = lazy(() => import('./components/leaderboard/Leaderboard'));

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center gradient-mesh">
    <div className="glass-card p-8 text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading...</p>
    </div>
  </div>
);

function AppContent() {
  const { currentTenant } = useTenant();
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

  // Show tenant selector if no tenant is selected
  if (!currentTenant) {
    return <TenantSelector />;
  }

  return (
    <SettingsProvider>
      <PlayerProvider>
        <AchievementProvider>
          <GameProvider>
            <Router>
              <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <AchievementNotification />
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/" element={<MainMenu />} />
                    <Route path="/game" element={<GameScreen />} />
                    <Route path="/players" element={<PlayerManagement />} />
                    <Route path="/players/:playerId" element={<PlayerProfile />} />
                    <Route path="/stats" element={<StatsOverview />} />
                    <Route path="/achievements" element={<AchievementsScreen />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/training" element={<TrainingMenu />} />
                    <Route path="/training/:mode" element={<TrainingScreen />} />
                    <Route path="/tournament" element={<TournamentMenu />} />
                    <Route path="/settings" element={<Settings darkMode={darkMode} setDarkMode={setDarkMode} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </div>
            </Router>
          </GameProvider>
        </AchievementProvider>
      </PlayerProvider>
    </SettingsProvider>
  );
}

function App() {
  return (
    <TenantProvider>
      <AppContent />
    </TenantProvider>
  );
}

export default App;
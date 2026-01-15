import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { GameProvider } from './context/GameContext';
import { PlayerProvider } from './context/PlayerContext';
import { SettingsProvider } from './context/SettingsContext';
import { AchievementProvider } from './context/AchievementContext';
import TenantSelector from './components/TenantSelector';
import MainMenu from './components/MainMenu';
import AchievementNotification from './components/achievements/AchievementNotification';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './index.css';

// Auth components (not lazy - need immediate load)
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import VerifyEmail from './components/auth/VerifyEmail';
import ResendVerification from './components/auth/ResendVerification';
import AuthCallback from './components/auth/AuthCallback';

// Payment components
import Pricing from './components/payment/Pricing';
import PaymentSuccess from './components/payment/PaymentSuccess';

// Lazy load heavy components
const GameScreen = lazy(() => import('./components/game/GameScreen'));
const PlayerManagement = lazy(() => import('./components/player/PlayerManagement'));
const PlayerProfile = lazy(() => import('./components/player/PlayerProfile'));
const StatsOverview = lazy(() => import('./components/stats/StatsOverview'));
const TrainingMenu = lazy(() => import('./components/training/TrainingMenu'));
const TrainingScreen = lazy(() => import('./components/training/TrainingScreen'));
const TrainingStats = lazy(() => import('./components/training/TrainingStats'));
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
    <Router>
      <AuthProvider>
        <TenantProvider>
          <SettingsProvider>
            <PlayerProvider>
              <AchievementProvider>
                <GameProvider>
                  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                    <AchievementNotification />
                    <Suspense fallback={<LoadingScreen />}>
                    <Routes>
                      {/* Public Auth Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/resend-verification" element={<ResendVerification />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      
                      {/* Pricing (accessible to authenticated users) */}
                      <Route path="/pricing" element={
                        <ProtectedRoute requireSubscription={false}>
                          <Pricing />
                        </ProtectedRoute>
                      } />
                      
                      {/* Payment Success */}
                      <Route path="/payment/success" element={
                        <ProtectedRoute requireSubscription={false}>
                          <PaymentSuccess />
                        </ProtectedRoute>
                      } />
                      
                      {/* Protected App Routes */}
                      <Route path="/" element={
                        <ProtectedRoute>
                          <MainMenu />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/game" element={
                        <ProtectedRoute>
                          <GameScreen />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/players" element={
                        <ProtectedRoute>
                          <PlayerManagement />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/players/:playerId" element={
                        <ProtectedRoute>
                          <PlayerProfile />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/stats" element={
                        <ProtectedRoute>
                          <StatsOverview />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/achievements" element={
                        <ProtectedRoute>
                          <AchievementsScreen />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/leaderboard" element={
                        <ProtectedRoute>
                          <Leaderboard />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/training" element={
                        <ProtectedRoute>
                          <TrainingMenu />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/training/:mode" element={
                        <ProtectedRoute>
                          <TrainingScreen />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/training-stats" element={
                        <ProtectedRoute>
                          <TrainingStats />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/tournament" element={
                        <ProtectedRoute>
                          <TournamentMenu />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <Settings darkMode={darkMode} setDarkMode={setDarkMode} />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    </Suspense>
                  </div>
                </GameProvider>
              </AchievementProvider>
            </PlayerProvider>
          </SettingsProvider>
        </TenantProvider>
      </AuthProvider>
    </Router>
  );
}

function App() {
  return (
    <AppContent />
  );
}

export default App;
import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { GameProvider } from './context/GameContext';
import { PlayerProvider } from './context/PlayerContext';
import { SettingsProvider } from './context/SettingsContext';
import { AchievementProvider } from './context/AchievementContext';
import MainMenu from './components/MainMenu';
import AchievementNotification from './components/achievements/AchievementNotification';
import OfflineIndicator from './components/sync/OfflineIndicator';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ThemeManager from './components/ThemeManager';
import Footer from './components/Footer';
import './index.css';

// Auth components (not lazy - need immediate load)
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import VerifyEmail from './components/auth/VerifyEmail';
import ResendVerification from './components/auth/ResendVerification';
import AuthCallback from './components/auth/AuthCallback';
import UserSettings from './components/auth/UserSettings';

// Payment components
import Pricing from './components/payment/Pricing';
import PaymentSuccess from './components/payment/PaymentSuccess';

// Lazy load helper with auto-reload on chunk load failure
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assuming that the user is not on the latest version of the application.
        // Let's refresh the page immediately to get the latest version.
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      // If we already tried refreshing, throw the error
      throw error;
    }
  });

// Lazy load heavy components
const GameScreen = lazyWithRetry(() => import('./components/game/GameScreen'));
const PlayerManagement = lazyWithRetry(() => import('./components/player/PlayerManagement'));
const PlayerProfile = lazyWithRetry(() => import('./components/player/PlayerProfile'));
const StatsOverview = lazyWithRetry(() => import('./components/stats/StatsOverview'));
const TrainingMenu = lazyWithRetry(() => import('./components/training/TrainingMenu'));
const TrainingScreen = lazyWithRetry(() => import('./components/training/TrainingScreen'));
const TrainingStats = lazyWithRetry(() => import('./components/training/TrainingStats'));
const TournamentMenu = lazyWithRetry(() => import('./components/tournament/TournamentMenu'));
const CricketGame = lazyWithRetry(() => import('./components/game/CricketGame'));
const AroundTheClockGame = lazyWithRetry(() => import('./components/game/AroundTheClockGame'));
const ShanghaiGame = lazyWithRetry(() => import('./components/game/ShanghaiGame'));
const OnlineMultiplayer = lazyWithRetry(() => import('./components/game/OnlineMultiplayer'));
const Settings = lazyWithRetry(() => import('./components/Settings'));
const AchievementsScreen = lazyWithRetry(() => import('./components/achievements/AchievementsScreen'));
const Leaderboard = lazyWithRetry(() => import('./components/leaderboard/Leaderboard'));
const GlobalLeaderboard = lazyWithRetry(() => import('./components/leaderboard/GlobalLeaderboard'));
const Dashboard = lazyWithRetry(() => import('./components/dashboard/Dashboard'));
const AdminPanel = lazyWithRetry(() => import('./components/admin/AdminPanel'));
const ResumeGameScreen = lazyWithRetry(() => import('./components/game/ResumeGameScreen'));
const MatchHistoryPage = lazyWithRetry(() => import('./components/stats/MatchHistoryPage'));

// Legal pages
const Impressum = lazyWithRetry(() => import('./components/legal/Impressum'));
const Datenschutz = lazyWithRetry(() => import('./components/legal/Datenschutz'));
const Nutzungsbedingungen = lazyWithRetry(() => import('./components/legal/Nutzungsbedingungen'));

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
            <ThemeManager />
            <PlayerProvider>
              <AchievementProvider>
                <GameProvider>
                  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
                    <AchievementNotification />
                    <OfflineIndicator />
                    <div className="flex-1">
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

                      {/* Public Legal Pages */}
                      <Route path="/impressum" element={<Impressum />} />
                      <Route path="/datenschutz" element={<Datenschutz />} />
                      <Route path="/nutzungsbedingungen" element={<Nutzungsbedingungen />} />

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
                      
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/game" element={
                        <ProtectedRoute>
                          <GameScreen />
                        </ProtectedRoute>
                      } />

                      <Route path="/resume" element={
                        <ProtectedRoute>
                          <ResumeGameScreen />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/cricket" element={
                        <ProtectedRoute>
                          <CricketGame />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/around-the-clock" element={
                        <ProtectedRoute>
                          <AroundTheClockGame />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/shanghai" element={
                        <ProtectedRoute>
                          <ShanghaiGame />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/online" element={
                        <ProtectedRoute>
                          <OnlineMultiplayer />
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

                      <Route path="/match-history" element={
                        <ProtectedRoute>
                          <MatchHistoryPage />
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
                      
                      <Route path="/global-leaderboard" element={<GlobalLeaderboard />} />
                      
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
                      
                      <Route path="/account" element={
                        <ProtectedRoute requireSubscription={false}>
                          <UserSettings />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="/admin" element={
                        <ProtectedRoute requireSubscription={false}>
                          <AdminPanel />
                        </ProtectedRoute>
                      } />
                      
                      <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                      </Suspense>
                    </div>
                    <Footer />
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
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader, Mail, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  requireEmailVerification?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireSubscription = true,
  requireEmailVerification = true
}) => {
  const { isAuthenticated, loading, hasActiveSubscription, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="text-center">
          <Loader className="animate-spin text-primary-400 mx-auto mb-4" size={48} />
          <p className="text-white text-lg">Lade...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Email not verified -> show verification required screen
  if (requireEmailVerification && user && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-yellow-400" size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            E-Mail-Bestätigung erforderlich
          </h2>
          
          <p className="text-gray-300 mb-6">
            Bitte bestätige deine E-Mail-Adresse <strong className="text-white">{user.email}</strong>, um fortzufahren.
          </p>
          
          <div className="bg-dark-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-400 text-left">
                Wir haben dir eine E-Mail mit einem Bestätigungslink gesendet. Prüfe auch deinen Spam-Ordner.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <a
              href="/resend-verification"
              className="block w-full px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-all"
            >
              Bestätigungsmail erneut senden
            </a>
            <button
              onClick={() => window.location.reload()}
              className="block w-full px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-semibold transition-all"
            >
              Seite neu laden
            </button>
            <a
              href="/login"
              onClick={() => {
                localStorage.removeItem('auth_token');
              }}
              className="block w-full px-6 py-3 text-gray-400 hover:text-white transition-all"
            >
              Mit anderem Konto anmelden
            </a>
          </div>
        </div>
      </div>
    );
  }

  // No active subscription -> redirect to pricing
  if (requireSubscription && !hasActiveSubscription) {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

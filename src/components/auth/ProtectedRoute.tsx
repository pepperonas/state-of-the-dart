import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Mail, AlertTriangle } from 'lucide-react';
import LoadingIndicator from '../common/LoadingIndicator';

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
  const { t } = useTranslation();
  const { isAuthenticated, loading, hasActiveSubscription, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh">
        <div className="bg-surface-container rounded-m3-lg px-8 py-6 text-center shadow-m3-1 m3-enter-pop">
          <LoadingIndicator size={48} />
          <p className="text-on-surface m3-title-medium">{t('common.loading')}</p>
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
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="m3-card m3-elevated rounded-m3-xl p-8 max-w-md w-full text-center m3-enter-pop">
          <div className="w-20 h-20 bg-tertiary-container rounded-m3-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-on-tertiary-container" size={40} />
          </div>

          <h2 className="m3-headline-small m3-emphasized text-on-surface mb-4">
            {t('protected_route.verification_required')}
          </h2>

          <p className="m3-body-medium text-on-surface-variant mb-6">
            <Trans
              i18nKey="protected_route.confirm_email"
              values={{ email: user.email }}
              components={{ strong: <strong className="text-on-surface" /> }}
            />
          </p>

          <div className="bg-surface-container rounded-m3-md p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-tertiary flex-shrink-0 mt-0.5" size={20} />
              <p className="m3-body-small text-on-surface-variant text-left">
                {t('protected_route.check_spam')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href="/resend-verification"
              className="block w-full px-6 py-3 bg-primary hover:opacity-90 text-on-primary rounded-m3-full font-semibold transition-all"
            >
              {t('protected_route.resend')}
            </a>
            <button
              onClick={() => window.location.reload()}
              className="block w-full px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-m3-full font-semibold transition-all"
            >
              {t('protected_route.reload')}
            </button>
            <a
              href="/login"
              onClick={() => {
                localStorage.removeItem('auth_token');
              }}
              className="block w-full px-6 py-3 text-on-surface-variant hover:text-on-surface transition-all"
            >
              {t('protected_route.other_account')}
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

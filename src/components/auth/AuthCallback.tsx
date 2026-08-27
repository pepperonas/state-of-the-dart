import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { setAuthToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      console.log('AuthCallback: token received:', token ? 'yes' : 'no');

      if (token) {
        try {
          // Save token
          setAuthToken(token);
          console.log('AuthCallback: token saved to localStorage');

          // Load user
          await refreshUser();
          console.log('AuthCallback: user refreshed, navigating to /');

          // Redirect to home
          navigate('/', { replace: true });
        } catch (err) {
          console.error('AuthCallback: error during auth:', err);
          setError('Authentifizierung fehlgeschlagen');
          setTimeout(() => navigate('/login?error=auth_failed', { replace: true }), 2000);
        }
      } else {
        // No token, redirect to login with error
        console.log('AuthCallback: no token found');
        navigate('/login?error=auth_failed', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="text-center m3-enter-pop">
        {error ? (
          <>
            <div className="text-error text-5xl mb-4">!</div>
            <h2 className="m3-headline-small text-on-surface mb-2">
              Fehler
            </h2>
            <p className="m3-body-large text-error">
              {error}
            </p>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
            <h2 className="m3-headline-small text-on-surface mb-2">
              Anmeldung läuft...
            </h2>
            <p className="m3-body-medium text-on-surface-variant">
              Du wirst weitergeleitet
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

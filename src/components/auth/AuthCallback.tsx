import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { setAuthToken } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Save token
      setAuthToken(token);
      
      // Load user
      refreshUser().then(() => {
        // Redirect to home
        navigate('/');
      });
    } else {
      // No token, redirect to login with error
      navigate('/login?error=auth_failed');
    }
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
      <div className="text-center">
        <Loader className="animate-spin text-primary-400 mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">
          Anmeldung läuft...
        </h2>
        <p className="text-dark-300">
          Du wirst weitergeleitet
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;

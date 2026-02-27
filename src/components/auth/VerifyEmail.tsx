import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../../services/api';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setError('Kein Verification-Token gefunden');
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    try {
      await api.auth.verifyEmail(token);
      setSuccess(true);
      // Auto-redirect after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Verification fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 rounded-2xl shadow-2xl text-center">
            <Loader className="animate-spin text-primary-400 mx-auto mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white mb-2">
              Verifiziere Email...
            </h2>
            <p className="text-dark-300">
              Bitte warte einen Moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Email erfolgreich verifiziert! 🎉
            </h2>
            <p className="text-dark-300 mb-6">
              Dein 30-Tage-Trial hat begonnen! Du kannst dich jetzt anmelden und loslegen.
            </p>
            <Link
              to="/login"
              className="block w-full py-3 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-semibold transition-all"
            >
              Jetzt anmelden
            </Link>
            <p className="text-xs text-dark-400 mt-4">
              Du wirst automatisch weitergeleitet...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8 rounded-2xl shadow-2xl text-center">
          <AlertCircle className="text-error-400 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-white mb-4">
            Verification fehlgeschlagen
          </h2>
          <p className="text-dark-300 mb-6">
            {error || 'Der Verification-Link ist ungültig oder abgelaufen.'}
          </p>
          <div className="space-y-3">
            <Link
              to="/resend-verification"
              className="block w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all"
            >
              Neuen Link anfordern
            </Link>
            <Link
              to="/login"
              className="block w-full py-3 text-primary-400 hover:text-primary-300 transition-colors"
            >
              Zum Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

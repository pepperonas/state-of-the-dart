import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, googleAuth } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    googleAuth();
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Registrierung erfolgreich! 🎉
            </h2>
            <p className="text-dark-300 mb-6">
              Wir haben dir eine Email an <strong className="text-white">{email}</strong> gesendet.
              Bitte verifiziere deine Email-Adresse, um fortzufahren.
            </p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all"
              >
                Zum Login
              </Link>
              <button
                onClick={() => navigate('/resend-verification')}
                className="block w-full py-3 text-primary-400 hover:text-primary-300 transition-colors"
              >
                Email nicht erhalten? Erneut senden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            State of the Dart
          </h1>
          <p className="text-dark-300">Erstelle deinen kostenlosen Account</p>
        </div>

        {/* Register Card */}
        <div className="glass-card p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">Registrieren</h2>
          <p className="text-sm text-dark-300 mb-6">
            🎁 <strong className="text-primary-400">30 Tage kostenlos</strong> testen!
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border-2 border-red-500 rounded-lg flex items-center gap-3 text-white shadow-lg shadow-red-500/20 animate-shake">
              <AlertCircle size={24} className="text-red-400 flex-shrink-0" />
              <span className="font-semibold text-base">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                  className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Passwort wiederholen"
                  className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Erstelle Account...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Kostenlos registrieren
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-900 text-dark-400">Oder</span>
            </div>
          </div>

          {/* Google Register */}
          <button
            onClick={handleGoogleAuth}
            className="w-full py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Mit Google registrieren
          </button>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-dark-300">
            Bereits ein Account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold">
              Jetzt anmelden
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

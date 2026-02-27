import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Senden der Email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Email gesendet! 📧
            </h2>
            <p className="text-dark-300 mb-6">
              Wir haben dir eine Email an <strong className="text-white">{email}</strong> gesendet.
              Folge den Anweisungen um dein Passwort zurückzusetzen.
            </p>
            <Link
              to="/login"
              className="block w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all"
            >
              Zum Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Passwort vergessen?
          </h1>
          <p className="text-dark-300">Kein Problem! Wir helfen dir.</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl shadow-2xl">
          <Link
            to="/login"
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all inline-flex w-fit"
          >
            <ArrowLeft size={20} />
            Zurück zum Login
          </Link>

          <h2 className="text-2xl font-bold text-white mb-2">
            Passwort zurücksetzen
          </h2>
          <p className="text-sm text-dark-300 mb-6">
            Gib deine Email-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
          </p>

          {error && (
            <div className="mb-4 p-4 bg-error-500/10 border border-error-500/30 rounded-lg flex items-center gap-2 text-error-400">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Sende Email...
                </>
              ) : (
                <>
                  <Mail size={20} />
                  Reset-Link senden
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

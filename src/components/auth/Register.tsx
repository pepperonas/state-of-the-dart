import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, TextField } from '../common';
import { enterDrop, enterPop } from '../../utils/motion';
import BackToLanding from './BackToLanding';
import { Icon } from '../icons';

const Register: React.FC = () => {
  const { t } = useTranslation();
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
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <BackToLanding />
          <motion.div {...enterPop}>
            <Card variant="elevated" className="p-8 text-center">
              <div className="w-16 h-16 bg-success-container rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-on-success-container" size={32} />
              </div>
              <h2 className="m3-headline-small font-bold text-on-surface mb-4">
                Registrierung erfolgreich!
              </h2>
              <p className="m3-body-large text-on-surface-variant mb-6">
                Wir haben dir eine Email an <strong className="text-on-surface">{email}</strong> gesendet.
                Bitte verifiziere deine Email-Adresse, um fortzufahren.
              </p>
              <div className="space-y-3">
                <Link to="/login">
                  <Button variant="filled" size="lg" fullWidth>
                    Zum Login
                  </Button>
                </Link>
                <Button
                  variant="text"
                  size="lg"
                  fullWidth
                  onClick={() => navigate('/resend-verification')}
                >
                  Email nicht erhalten? Erneut senden
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <BackToLanding />
        {/* Logo/Header */}
        <motion.div {...enterDrop} className="text-center mb-8">
          <div className="mb-4 flex justify-center text-primary"><Icon name="target" size={56} /></div>
          <h1 className="m3-display-small font-bold text-on-surface mb-2">
            State of the Dart
          </h1>
          <p className="m3-body-large text-on-surface-variant">Erstelle deinen kostenlosen Account</p>
        </motion.div>

        {/* Register Card */}
        <motion.div {...enterPop}>
          <Card variant="elevated" className="p-8">
            <h2 className="m3-headline-small font-bold text-on-surface mb-2">Registrieren</h2>
            <p className="m3-body-medium text-on-surface-variant mb-6">
              <strong style={{ color:'var(--m3-primary)'}}>30 Tage kostenlos</strong> testen!
            </p>

            {error && (
              <div className="mb-4 p-4 bg-error-container text-on-error-container rounded-m3-md flex items-center gap-3 m3-error-in">
                <AlertCircle size={22} className="flex-shrink-0" />
                <span className="m3-body-medium font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <TextField
                type="text"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dein Name"
                icon={<User size={20} />}
                required
              />

              <TextField
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                icon={<Mail size={20} />}
                required
              />

              <TextField
                type="password"
                label="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                icon={<Lock size={20} />}
                required
              />

              <TextField
                type="password"
                label="Passwort bestätigen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                icon={<Lock size={20} />}
                required
              />

              <Button type="submit" variant="success" size="lg" fullWidth loading={loading} icon={<UserPlus size={20} />}>
                {loading ? 'Erstelle Account...' : 'Kostenlos registrieren'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 m3-body-small bg-surface-container-low text-on-surface-variant">Oder</span>
              </div>
            </div>

            {/* Google Register */}
            <Button
              variant="outlined"
              size="lg"
              fullWidth
              onClick={handleGoogleAuth}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
            >
              Mit Google registrieren
            </Button>

            {/* Login Link */}
            <div className="mt-6 text-center m3-body-medium text-on-surface-variant">
              Bereits ein Account?{' '}
              <Link to="/login" className="font-semibold" style={{ color: 'var(--m3-primary)' }}>
                Jetzt anmelden
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;

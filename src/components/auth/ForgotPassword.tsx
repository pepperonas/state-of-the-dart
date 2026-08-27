import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import BackButton from '../common/BackButton';
import { Button, Card, TextField } from '../common';
import { enterDrop, enterPop } from '../../utils/motion';
import BackToLanding from './BackToLanding';
import { Icon } from '../icons';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
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
          <BackToLanding />
          <motion.div {...enterPop}>
            <Card variant="elevated" className="p-8 text-center">
              <div className="w-16 h-16 bg-success-container rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-on-success-container" size={32} />
              </div>
              <h2 className="m3-headline-small font-bold text-on-surface mb-4">
                Email gesendet!
              </h2>
              <p className="m3-body-large text-on-surface-variant mb-6">
                Wir haben dir eine Email an <strong className="text-on-surface">{email}</strong> gesendet.
                Folge den Anweisungen um dein Passwort zurückzusetzen.
              </p>
              <Link to="/login">
                <Button variant="filled" size="lg" fullWidth>
                  Zum Login
                </Button>
              </Link>
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
          <div className="mb-4 flex justify-center text-primary"><Icon name="lock" size={56} /></div>
          <h1 className="m3-display-small font-bold text-on-surface mb-2">
            Passwort vergessen?
          </h1>
          <p className="m3-body-large text-on-surface-variant">Kein Problem! Wir helfen dir.</p>
        </motion.div>

        {/* Card */}
        <motion.div {...enterPop}>
          <Card variant="elevated" className="p-8">
            <BackButton onClick={() => navigate('/login')} label="Zurück zum Login" inline />

            <h2 className="m3-headline-small font-bold text-on-surface mb-2">
              Passwort zurücksetzen
            </h2>
            <p className="m3-body-medium text-on-surface-variant mb-6">
              Gib deine Email-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-error-container text-on-error-container rounded-m3-md flex items-center gap-3 m3-error-in">
                <AlertCircle size={22} className="flex-shrink-0" />
                <span className="m3-body-medium font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <TextField
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                icon={<Mail size={20} />}
                required
              />

              <Button type="submit" variant="filled" size="lg" fullWidth loading={loading} icon={<Mail size={20} />}>
                {loading ? 'Sende Email...' : 'Reset-Link senden'}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;

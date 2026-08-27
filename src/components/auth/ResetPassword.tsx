import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { Button, Card, TextField } from '../common';
import { enterDrop, enterPop } from '../../utils/motion';
import BackToLanding from './BackToLanding';
import { Icon } from '../icons';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Ungültiger Reset-Link');
      return;
    }

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
      await api.auth.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Zurücksetzen des Passworts');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="w-full max-w-md">
          <BackToLanding />
          <motion.div {...enterPop}>
            <Card variant="elevated" className="p-8 text-center">
              <AlertCircle className="text-error mx-auto mb-4" size={48} />
              <h2 className="m3-headline-small font-bold text-on-surface mb-4">
                Ungültiger Link
              </h2>
              <p className="m3-body-large text-on-surface-variant mb-6">
                Der Reset-Link ist ungültig oder abgelaufen.
              </p>
              <Link to="/forgot-password">
                <Button variant="filled" size="lg" fullWidth>
                  Neuen Link anfordern
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

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
                Passwort erfolgreich geändert!
              </h2>
              <p className="m3-body-large text-on-surface-variant mb-6">
                Du wirst automatisch zum Login weitergeleitet...
              </p>
              <Link to="/login">
                <Button variant="filled" size="lg" fullWidth>
                  Jetzt anmelden
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
        <motion.div {...enterDrop} className="text-center mb-8">
          <div className="mb-4 flex justify-center text-primary"><Icon name="key" size={56} /></div>
          <h1 className="m3-display-small font-bold text-on-surface mb-2">
            Neues Passwort setzen
          </h1>
        </motion.div>

        <motion.div {...enterPop}>
          <Card variant="elevated" className="p-8">
            {error && (
              <div className="mb-4 p-4 bg-error-container text-on-error-container rounded-m3-md flex items-center gap-3 m3-error-in">
                <AlertCircle size={22} className="flex-shrink-0" />
                <span className="m3-body-medium font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <TextField
                type="password"
                label="Neues Passwort"
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

              <Button type="submit" variant="success" size="lg" fullWidth loading={loading} icon={<Lock size={20} />}>
                {loading ? 'Speichern...' : 'Passwort ändern'}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;

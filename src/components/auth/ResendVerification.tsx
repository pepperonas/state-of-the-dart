import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import BackButton from '../common/BackButton';
import { Card, Button, TextField } from '../common';

const ResendVerification: React.FC = () => {
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
      await api.auth.resendVerification(email);
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
          <Card variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 bg-success-container rounded-m3-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success" size={32} />
            </div>
            <h2 className="m3-headline-small text-on-surface mb-4">
              Email gesendet! 📧
            </h2>
            <p className="m3-body-medium text-on-surface-variant mb-6">
              Wir haben dir eine neue Verification-Email an <strong className="text-on-surface">{email}</strong> gesendet.
              Bitte überprüfe deinen Posteingang.
            </p>
            <Button variant="filled" fullWidth onClick={() => navigate('/login')}>
              Zum Login
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="m3-display-small text-on-surface mb-2">
            Verification-Email erneut senden
          </h1>
        </div>

        <Card variant="elevated" className="p-8">
          <BackButton onClick={() => navigate('/login')} label="Zurück zum Login" inline />

          <p className="m3-body-medium text-on-surface-variant mb-6">
            Email nicht erhalten? Gib deine Email-Adresse ein und wir senden dir einen neuen Verification-Link.
          </p>

          {error && (
            <div
              className={`mb-4 p-4 rounded-m3-md flex items-center gap-3 ${
                error.includes('already verified')
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              <AlertCircle
                size={24}
                className={error.includes('already verified') ? 'text-primary flex-shrink-0' : 'text-error flex-shrink-0'}
              />
              <span className="m3-label-large">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              type="email"
              label="Email"
              icon={<Mail size={20} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              required
            />

            <Button
              type="submit"
              variant="filled"
              fullWidth
              loading={loading}
              icon={!loading ? <Mail size={20} /> : undefined}
            >
              {loading ? 'Sende Email...' : 'Erneut senden'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResendVerification;
